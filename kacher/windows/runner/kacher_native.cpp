#include "kacher_native.h"

#include <flutter/encodable_value.h>
#include <flutter/method_channel.h>
#include <flutter/standard_method_codec.h>

#include <atomic>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <functional>
#include <mutex>
#include <string>
#include <vector>

namespace {

constexpr int kHotRecord = 1;
constexpr int kHotStop = 2;
constexpr int kHotPlay = 3;
constexpr int kHotPause = 4;
constexpr uint32_t kVigemOk = 0x20000000;

#pragma pack(push, 1)
struct KrecHeader {
  char magic[4];
  uint32_t version;
  uint32_t headerSize;
  uint32_t eventCount;
  uint32_t reserved0;
  uint64_t durationUs;
  uint64_t createdUnixMs;
  uint32_t playbackMode;
  uint32_t loopIntervalMs;
  uint32_t loopCount;
  uint32_t flags;
  char name[240];
  uint8_t padding[3804];
};

struct KrecEvent {
  uint32_t dtUs;
  uint8_t type;
  uint8_t flags;
  uint16_t code;
  int32_t x;
  int32_t y;
  int32_t z;
  int32_t w;
  int32_t v;
  uint32_t reserved;
};
#pragma pack(pop)

static_assert(sizeof(KrecHeader) == 4096, "krec header");
static_assert(offsetof(KrecHeader, durationUs) == 20, "duration offset");
static_assert(offsetof(KrecHeader, name) == 52, "name offset");
static_assert(sizeof(KrecEvent) == 32, "krec event");

struct StampEvent {
  uint64_t qpc;
  uint8_t type;
  uint8_t flags;
  uint16_t code;
  int32_t x;
  int32_t y;
  int32_t z;
  int32_t w;
  int32_t v;
};

struct XiGamepad {
  WORD buttons;
  BYTE left_trigger;
  BYTE right_trigger;
  SHORT thumb_lx;
  SHORT thumb_ly;
  SHORT thumb_rx;
  SHORT thumb_ry;
};

struct XiState {
  DWORD packet;
  XiGamepad pad;
};

static_assert(sizeof(XiState) == 16, "xinput state");

struct XusbReport {
  USHORT buttons;
  BYTE left_trigger;
  BYTE right_trigger;
  SHORT thumb_lx;
  SHORT thumb_ly;
  SHORT thumb_rx;
  SHORT thumb_ry;
};

static_assert(sizeof(XusbReport) == 12, "xusb report");

using XInputGetStateFn = DWORD(WINAPI*)(DWORD, XiState*);
using VigemAllocFn = void*(__cdecl*)();
using VigemFreeFn = void(__cdecl*)(void*);
using VigemConnectFn = uint32_t(__cdecl*)(void*);
using VigemDisconnectFn = void(__cdecl*)(void*);
using VigemTargetAllocFn = void*(__cdecl*)();
using VigemTargetFreeFn = void(__cdecl*)(void*);
using VigemTargetAddFn = uint32_t(__cdecl*)(void*, void*);
using VigemTargetRemoveFn = uint32_t(__cdecl*)(void*, void*);
using VigemUpdateFn = uint32_t(__cdecl*)(void*, void*, XusbReport);

template <typename T, uint32_t kCap>
class Spsc {
 public:
  static_assert((kCap & (kCap - 1)) == 0, "capacity");

  bool Push(const T& item) {
    const uint32_t write = write_.load(std::memory_order_relaxed);
    const uint32_t read = read_.load(std::memory_order_acquire);
    if (write - read >= kCap) return false;
    slots_[write & (kCap - 1)] = item;
    write_.store(write + 1, std::memory_order_release);
    return true;
  }

  bool Peek(T& item) {
    const uint32_t read = read_.load(std::memory_order_relaxed);
    const uint32_t write = write_.load(std::memory_order_acquire);
    if (read == write) return false;
    item = slots_[read & (kCap - 1)];
    return true;
  }

  bool Pop(T& item) {
    const uint32_t read = read_.load(std::memory_order_relaxed);
    const uint32_t write = write_.load(std::memory_order_acquire);
    if (read == write) return false;
    item = slots_[read & (kCap - 1)];
    read_.store(read + 1, std::memory_order_release);
    return true;
  }

  uint32_t Size() const {
    return write_.load(std::memory_order_acquire) - read_.load(std::memory_order_acquire);
  }

  void Clear() {
    read_.store(0, std::memory_order_relaxed);
    write_.store(0, std::memory_order_relaxed);
  }

 private:
  T slots_[kCap]{};
  std::atomic<uint32_t> write_{0};
  std::atomic<uint32_t> read_{0};
};

struct FileCloser {
  FILE* file = nullptr;
  ~FileCloser() {
    if (file != nullptr) fclose(file);
  }
  FileCloser() = default;
  FileCloser(const FileCloser&) = delete;
  FileCloser& operator=(const FileCloser&) = delete;
};

struct ModSlot {
  bool down = false;
  bool emitted = false;
  uint16_t vk = 0;
  uint16_t scan = 0;
  bool extended = false;
};

struct HeldKey {
  bool down = false;
  bool extended = false;
  WORD vk = 0;
  WORD scan = 0;
};

int AbsInt(int value) { return value < 0 ? -value : value; }

std::wstring ExePath() {
  std::wstring buffer(32768, L'\0');
  const DWORD length = GetModuleFileNameW(nullptr, buffer.data(), static_cast<DWORD>(buffer.size()));
  if (length == 0 || length >= buffer.size()) return L"";
  buffer.resize(length);
  return buffer;
}

std::wstring DirOf(const std::wstring& path) {
  const size_t slash = path.find_last_of(L"\\/");
  if (slash == std::wstring::npos) return L"";
  return path.substr(0, slash);
}

std::wstring Utf8ToWide(const std::string& text) {
  if (text.empty()) return L"";
  const int size = MultiByteToWideChar(CP_UTF8, 0, text.data(), static_cast<int>(text.size()), nullptr, 0);
  if (size <= 0) return L"";
  std::wstring wide(static_cast<size_t>(size), L'\0');
  MultiByteToWideChar(CP_UTF8, 0, text.data(), static_cast<int>(text.size()), wide.data(), size);
  return wide;
}

std::string WideToUtf8(const std::wstring& text) {
  if (text.empty()) return "";
  const int size = WideCharToMultiByte(CP_UTF8, 0, text.data(), static_cast<int>(text.size()), nullptr, 0, nullptr, nullptr);
  if (size <= 0) return "";
  std::string utf8(static_cast<size_t>(size), '\0');
  WideCharToMultiByte(CP_UTF8, 0, text.data(), static_cast<int>(text.size()), utf8.data(), size, nullptr, nullptr);
  return utf8;
}

uint64_t UnixMs() {
  FILETIME file_time{};
  GetSystemTimeAsFileTime(&file_time);
  ULARGE_INTEGER value{};
  value.LowPart = file_time.dwLowDateTime;
  value.HighPart = file_time.dwHighDateTime;
  return value.QuadPart / 10000ull - 11644473600000ull;
}

void CopyName(char* dest, size_t dest_size, const std::string& name) {
  memset(dest, 0, dest_size);
  size_t count = name.size();
  if (count >= dest_size) count = dest_size - 1;
  if (count > 0) memcpy(dest, name.data(), count);
}

std::string ReadFileVersion(const std::wstring& path) {
  DWORD handle = 0;
  const DWORD size = GetFileVersionInfoSizeW(path.c_str(), &handle);
  if (size == 0) return "";
  std::vector<BYTE> data(size);
  if (!GetFileVersionInfoW(path.c_str(), 0, size, data.data())) return "";
  LPVOID raw = nullptr;
  UINT length = 0;
  if (!VerQueryValueW(data.data(), L"\\", &raw, &length) || raw == nullptr) return "";
  const auto* info = static_cast<const VS_FIXEDFILEINFO*>(raw);
  char buffer[64];
  sprintf_s(buffer, "%u.%u.%u", HIWORD(info->dwFileVersionMS), LOWORD(info->dwFileVersionMS),
            HIWORD(info->dwFileVersionLS));
  return buffer;
}

void FormatClock(wchar_t* buffer, size_t size, uint64_t microseconds) {
  const unsigned total = static_cast<unsigned>(microseconds / 1000000ull);
  const unsigned hours = total / 3600u;
  const unsigned minutes = (total / 60u) % 60u;
  const unsigned seconds = total % 60u;
  if (hours > 0) {
    swprintf_s(buffer, size, L"%u:%02u:%02u", hours, minutes, seconds);
  } else {
    swprintf_s(buffer, size, L"%02u:%02u", minutes, seconds);
  }
}

LONG NormCoord(int value, int origin, int size) {
  if (size <= 1) return 0;
  const int64_t delta = static_cast<int64_t>(value) - origin;
  if (delta <= 0) return 0;
  const int64_t denom = static_cast<int64_t>(size - 1);
  int64_t normalized = (delta * 65535 + denom / 2) / denom;
  if (normalized > 65535) normalized = 65535;
  return static_cast<LONG>(normalized);
}

template <typename T>
T LoadProc(HMODULE module, const char* name) {
#pragma warning(push)
#pragma warning(disable : 4191)
  T function = reinterpret_cast<T>(GetProcAddress(module, name));
#pragma warning(pop)
  return function;
}

const flutter::EncodableValue* FindArg(const flutter::EncodableMap& map, const char* key) {
  const auto it = map.find(flutter::EncodableValue(std::string(key)));
  if (it == map.end()) return nullptr;
  return &it->second;
}

std::string ArgString(const flutter::EncodableMap* map, const char* key) {
  if (map == nullptr) return "";
  const auto* value = FindArg(*map, key);
  if (value == nullptr) return "";
  if (const auto* text = std::get_if<std::string>(value)) return *text;
  return "";
}

int64_t ArgInt(const flutter::EncodableMap* map, const char* key, int64_t fallback = 0) {
  if (map == nullptr) return fallback;
  const auto* value = FindArg(*map, key);
  if (value == nullptr) return fallback;
  if (const auto* number = std::get_if<int32_t>(value)) return *number;
  if (const auto* number = std::get_if<int64_t>(value)) return *number;
  return fallback;
}

bool ArgBool(const flutter::EncodableMap* map, const char* key, bool fallback = false) {
  if (map == nullptr) return fallback;
  const auto* value = FindArg(*map, key);
  if (value == nullptr) return fallback;
  if (const auto* flag = std::get_if<bool>(value)) return *flag;
  return fallback;
}

}  // namespace

class KacherNative::Impl {
 public:
  Impl() {
    self_ = this;
    LARGE_INTEGER frequency{};
    QueryPerformanceFrequency(&frequency);
    freq_ = frequency.QuadPart == 0 ? 1 : static_cast<uint64_t>(frequency.QuadPart);
    writer_ready_ = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    hook_ready_ = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    play_ready_ = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    writer_wake_ = CreateEventW(nullptr, FALSE, FALSE, nullptr);
    play_wake_ = CreateEventW(nullptr, FALSE, FALSE, nullptr);
  }

  ~Impl() {
    uint32_t events = 0;
    uint64_t duration = 0;
    bool gamepad = false;
    uint32_t dropped = 0;
    StopCapture(events, duration, gamepad, dropped);
    StopPlayback();
    HideOverlay();
    if (channel_) {
      channel_->SetMethodCallHandler(nullptr);
      channel_.reset();
    }
    Close(writer_ready_);
    Close(hook_ready_);
    Close(play_ready_);
    Close(writer_wake_);
    Close(play_wake_);
    if (self_ == this) self_ = nullptr;
  }

  void Attach(flutter::BinaryMessenger* messenger, HWND hwnd) {
    self_ = this;
    hwnd_ = hwnd;
    channel_ = std::make_unique<flutter::MethodChannel<flutter::EncodableValue>>(
        messenger, "kacher/native", &flutter::StandardMethodCodec::GetInstance());
    channel_->SetMethodCallHandler(
        [this](const flutter::MethodCall<flutter::EncodableValue>& call,
               std::unique_ptr<flutter::MethodResult<flutter::EncodableValue>> result) {
          Handle(call, std::move(result));
        });
    RegisterHotkeys();
  }

  void Detach() {
    shutting_down_ = true;
    uint32_t events = 0;
    uint64_t duration = 0;
    bool gamepad = false;
    uint32_t dropped = 0;
    StopCapture(events, duration, gamepad, dropped);
    StopPlayback();
    HideOverlay();
    UnregisterHotkeys();
    if (channel_) {
      channel_->SetMethodCallHandler(nullptr);
      channel_.reset();
    }
    hwnd_ = nullptr;
  }

  void DrainUi() {
    std::vector<std::function<void()>> local;
    {
      std::lock_guard<std::mutex> lock(ui_mu_);
      local.swap(ui_q_);
    }
    for (auto& task : local) task();
  }

  void OnHotkey(WPARAM id) {
    const char* action = nullptr;
    switch (id) {
      case kHotRecord:
        action = "record";
        break;
      case kHotStop:
        action = "stop";
        break;
      case kHotPlay:
        action = "play";
        break;
      case kHotPause:
        action = "pause";
        break;
      default:
        return;
    }
    flutter::EncodableMap map;
    map[flutter::EncodableValue("action")] = flutter::EncodableValue(std::string(action));
    Emit("onHotkey", map);
  }

 private:
  static Impl* self_;
  static LRESULT CALLBACK OverlayWndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp);
  static LRESULT CALLBACK MouseProc(int code, WPARAM wp, LPARAM lp);
  static LRESULT CALLBACK KeyProc(int code, WPARAM wp, LPARAM lp);
  static DWORD WINAPI WriterThunk(LPVOID param);
  static DWORD WINAPI HookThunk(LPVOID param);
  static DWORD WINAPI PadThunk(LPVOID param);
  static DWORD WINAPI PlayThunk(LPVOID param);

  void Handle(const flutter::MethodCall<flutter::EncodableValue>& call,
              std::unique_ptr<flutter::MethodResult<flutter::EncodableValue>> result);
  void Emit(const std::string& method, const flutter::EncodableMap& map);
  void PostToUi(std::function<void()> task);
  void RegisterHotkeys();
  void UnregisterHotkeys();
  void ShowOverlay(int mode, const std::wstring& title, const std::wstring& subtitle);
  void HideOverlay();
  void EnsureOverlay();
  void PlaceOverlay();
  void PaintOverlay(HWND hwnd);
  void OnOverlayTick();
  LRESULT OverlayMsg(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp);
  bool BeginCapture(const std::wstring& path, const std::string& name, std::string& error);
  void StopCapture(uint32_t& events, uint64_t& duration, bool& gamepad, uint32_t& dropped);
  bool Play(const std::wstring& path, int after, uint32_t interval, uint32_t count, int64_t token,
            bool& skipped, std::string& error);
  void StopPlayback();
  void SetPaused(bool paused);
  bool UpdateMeta(const std::wstring& path, const std::string& name, uint32_t mode, uint32_t interval,
                  uint32_t count, bool repair);
  bool SetStartup(bool enabled);
  bool Shutdown();
  DWORD WriterMain();
  DWORD HookMain();
  DWORD PadMain();
  DWORD PlayMain();
  void HandleMouse(WPARAM msg, LPARAM lp);
  void HandleKey(const KBDLLHOOKSTRUCT* info);
  bool PushInput(uint8_t type, uint8_t flags, uint16_t code, int32_t x, int32_t y, int32_t z, int32_t w,
                 int32_t v);
  void PushPad(uint8_t index, uint16_t buttons, uint8_t lt, uint8_t rt, SHORT lx, SHORT ly, SHORT rx, SHORT ry);
  void ReleaseMods();
  bool OverOverlay(POINT point) const;
  int ModIndex(DWORD vk) const;
  bool Chord() const;
  uint64_t QpcNow() const;
  uint64_t ToUs(uint64_t ticks) const;
  void JoinThread(HANDLE& thread);
  void Close(HANDLE& handle);
  void WriteInitialHeader(FILE* file);
  void WriteFinalHeader(FILE* file);
  void AppendEvent(FILE* file, const StampEvent& event, uint64_t& last);
  bool EnsureXInput();
  bool StartViGEm();
  void StopViGEm();
  void NeutralPads();
  bool EnsureTarget(int index);
  void Dispatch(const KrecEvent& event);
  void SendMouse(int x, int y, DWORD flags, DWORD data);
  void SendKey(WORD vk, WORD scan, bool down, bool extended);
  void ReleaseHeld();
  void WaitUntil(uint64_t origin, uint64_t target);
  void WaitMs(uint32_t milliseconds);
  void PlayStream(FILE* file, uint64_t duration);

  std::unique_ptr<flutter::MethodChannel<flutter::EncodableValue>> channel_;
  HWND hwnd_ = nullptr;
  HWND overlay_ = nullptr;
  std::mutex ui_mu_;
  std::vector<std::function<void()>> ui_q_;
  bool shutting_down_ = false;
  bool hotkeys_ = false;
  int mode_ = 0;
  std::wstring title_;
  std::wstring subtitle_;
  bool click_sent_ = false;
  bool hovering_ = false;
  bool hover_fired_ = false;
  ULONGLONG last_move_tick_ = 0;
  unsigned last_stat_second_ = 0xffffffffu;
  int last_stat_loop_ = -1;
  int last_stat_phase_ = -1;
  bool last_stat_paused_ = false;

  uint64_t freq_ = 1;
  std::atomic<int> phase_{0};
  std::atomic<bool> capturing_{false};
  std::atomic<bool> blocked_{false};
  std::atomic<uint64_t> start_qpc_{0};
  std::atomic<uint64_t> duration_us_{0};
  std::atomic<uint32_t> written_{0};
  std::atomic<uint32_t> dropped_moves_{0};
  std::atomic<uint32_t> dropped_other_{0};
  std::atomic<bool> has_pad_{false};
  std::atomic<bool> writer_run_{false};
  std::atomic<int> writer_error_{0};
  std::atomic<bool> hook_failed_{false};
  HANDLE writer_thread_ = nullptr;
  HANDLE hook_thread_ = nullptr;
  HANDLE pad_thread_ = nullptr;
  DWORD hook_tid_ = 0;
  HANDLE writer_ready_ = nullptr;
  HANDLE hook_ready_ = nullptr;
  HANDLE writer_wake_ = nullptr;
  HHOOK mouse_hook_ = nullptr;
  HHOOK key_hook_ = nullptr;
  std::wstring capture_path_;
  KrecHeader header_{};
  Spsc<StampEvent, 8192> input_q_;
  Spsc<StampEvent, 1024> pad_q_;
  ModSlot mods_[8]{};
  uint16_t swallow_vk_ = 0;
  LONG last_x_ = LONG_MIN;
  LONG last_y_ = LONG_MIN;
  XInputGetStateFn get_state_ = nullptr;

  HANDLE play_thread_ = nullptr;
  HANDLE play_ready_ = nullptr;
  HANDLE play_wake_ = nullptr;
  std::atomic<bool> play_stop_{false};
  std::atomic<bool> play_pause_{false};
  std::atomic<int> play_error_{0};
  std::atomic<bool> gamepad_skipped_{false};
  std::atomic<uint64_t> shown_elapsed_us_{0};
  std::atomic<int> shown_loop_{0};
  std::atomic<int> shown_phase_{0};
  std::atomic<int> loop_total_{0};
  std::wstring play_path_;
  int play_after_ = 0;
  uint32_t play_interval_ = 0;
  int64_t play_token_ = 0;
  uint64_t pause_us_ = 0;
  HeldKey held_[256]{};
  uint8_t mouse_mask_ = 0;
  int last_mouse_x_ = 0;
  int last_mouse_y_ = 0;
  bool have_mouse_ = false;
  HMODULE vigem_module_ = nullptr;
  void* vigem_client_ = nullptr;
  void* vigem_targets_[4]{};
  VigemAllocFn vigem_alloc_ = nullptr;
  VigemFreeFn vigem_free_ = nullptr;
  VigemConnectFn vigem_connect_ = nullptr;
  VigemDisconnectFn vigem_disconnect_ = nullptr;
  VigemTargetAllocFn vigem_target_alloc_ = nullptr;
  VigemTargetFreeFn vigem_target_free_ = nullptr;
  VigemTargetAddFn vigem_target_add_ = nullptr;
  VigemTargetRemoveFn vigem_target_remove_ = nullptr;
  VigemUpdateFn vigem_update_ = nullptr;
};

KacherNative::Impl* KacherNative::Impl::self_ = nullptr;

void KacherNative::Impl::Close(HANDLE& handle) {
  if (handle != nullptr) {
    CloseHandle(handle);
    handle = nullptr;
  }
}

void KacherNative::Impl::JoinThread(HANDLE& thread) {
  if (thread == nullptr) return;
  WaitForSingleObject(thread, 8000);
  CloseHandle(thread);
  thread = nullptr;
}

uint64_t KacherNative::Impl::QpcNow() const {
  LARGE_INTEGER counter{};
  QueryPerformanceCounter(&counter);
  return static_cast<uint64_t>(counter.QuadPart);
}

uint64_t KacherNative::Impl::ToUs(uint64_t ticks) const {
  return (ticks / freq_) * 1000000ull + (ticks % freq_) * 1000000ull / freq_;
}

void KacherNative::Impl::Emit(const std::string& method, const flutter::EncodableMap& map) {
  if (channel_ == nullptr || shutting_down_) return;
  channel_->InvokeMethod(method, std::make_unique<flutter::EncodableValue>(map));
}

void KacherNative::Impl::PostToUi(std::function<void()> task) {
  {
    std::lock_guard<std::mutex> lock(ui_mu_);
    ui_q_.push_back(std::move(task));
  }
  if (hwnd_ != nullptr) PostMessage(hwnd_, WM_KACHER_NOTIFY, 0, 0);
}

void KacherNative::Impl::RegisterHotkeys() {
  if (hwnd_ == nullptr || hotkeys_) return;
  const UINT mods = MOD_CONTROL | MOD_ALT | MOD_NOREPEAT;
  RegisterHotKey(hwnd_, kHotRecord, mods, 'R');
  RegisterHotKey(hwnd_, kHotStop, mods, 'S');
  RegisterHotKey(hwnd_, kHotPlay, mods, 'P');
  RegisterHotKey(hwnd_, kHotPause, mods, VK_SPACE);
  hotkeys_ = true;
}

void KacherNative::Impl::UnregisterHotkeys() {
  if (hwnd_ == nullptr || !hotkeys_) return;
  UnregisterHotKey(hwnd_, kHotRecord);
  UnregisterHotKey(hwnd_, kHotStop);
  UnregisterHotKey(hwnd_, kHotPlay);
  UnregisterHotKey(hwnd_, kHotPause);
  hotkeys_ = false;
}

void KacherNative::Impl::EnsureOverlay() {
  if (overlay_ != nullptr) return;
  static bool registered = false;
  if (!registered) {
    WNDCLASSW window_class{};
    window_class.lpfnWndProc = &Impl::OverlayWndProc;
    window_class.hInstance = GetModuleHandleW(nullptr);
    window_class.lpszClassName = L"KacherOverlayWindow";
    window_class.hCursor = LoadCursorW(nullptr, IDC_HAND);
    RegisterClassW(&window_class);
    registered = true;
  }
  overlay_ = CreateWindowExW(WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_LAYERED | WS_EX_NOACTIVATE,
                             L"KacherOverlayWindow", L"", WS_POPUP, 0, 0, 120, 48, nullptr, nullptr,
                             GetModuleHandleW(nullptr), this);
  if (overlay_ == nullptr) return;
  SetLayeredWindowAttributes(overlay_, 0, 214, LWA_ALPHA);
  SetTimer(overlay_, 1, 200, nullptr);
}

void KacherNative::Impl::PlaceOverlay() {
  if (overlay_ == nullptr) return;
  POINT cursor{};
  GetCursorPos(&cursor);
  HMONITOR monitor = MonitorFromPoint(cursor, MONITOR_DEFAULTTONEAREST);
  MONITORINFO info{};
  info.cbSize = sizeof(info);
  GetMonitorInfoW(monitor, &info);
  UINT dpi = GetDpiForWindow(overlay_);
  if (dpi == 0) dpi = 96;
  const int width = MulDiv(280, static_cast<int>(dpi), 96);
  const int height = MulDiv(86, static_cast<int>(dpi), 96);
  const int margin = MulDiv(16, static_cast<int>(dpi), 96);
  const int x = info.rcWork.right - width - margin;
  const int y = info.rcWork.bottom - height - margin;
  SetWindowPos(overlay_, HWND_TOPMOST, x, y, width, height, SWP_NOACTIVATE | SWP_SHOWWINDOW);
  const int radius = MulDiv(16, static_cast<int>(dpi), 96);
  HRGN region = CreateRoundRectRgn(0, 0, width + 1, height + 1, radius, radius);
  SetWindowRgn(overlay_, region, TRUE);
}

void KacherNative::Impl::ShowOverlay(int mode, const std::wstring& title, const std::wstring& subtitle) {
  mode_ = mode;
  title_ = title;
  subtitle_ = subtitle;
  click_sent_ = false;
  hover_fired_ = false;
  hovering_ = false;
  last_stat_second_ = 0xffffffffu;
  EnsureOverlay();
  PlaceOverlay();
  if (overlay_ != nullptr) InvalidateRect(overlay_, nullptr, FALSE);
}

void KacherNative::Impl::HideOverlay() {
  mode_ = 0;
  if (overlay_ == nullptr) return;
  KillTimer(overlay_, 1);
  DestroyWindow(overlay_);
  overlay_ = nullptr;
}

LRESULT CALLBACK KacherNative::Impl::OverlayWndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
  if (msg == WM_NCCREATE) {
    const auto* created = reinterpret_cast<CREATESTRUCTW*>(lp);
    SetWindowLongPtrW(hwnd, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(created->lpCreateParams));
  }
  auto* self = reinterpret_cast<Impl*>(GetWindowLongPtrW(hwnd, GWLP_USERDATA));
  if (self == nullptr) return DefWindowProcW(hwnd, msg, wp, lp);
  return self->OverlayMsg(hwnd, msg, wp, lp);
}

LRESULT KacherNative::Impl::OverlayMsg(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
  switch (msg) {
    case WM_MOUSEACTIVATE:
      return MA_NOACTIVATE;
    case WM_ERASEBKGND:
      return 1;
    case WM_PAINT:
      PaintOverlay(hwnd);
      return 0;
    case WM_LBUTTONDOWN:
      if (!click_sent_) {
        click_sent_ = true;
        flutter::EncodableMap map;
        map[flutter::EncodableValue("action")] = flutter::EncodableValue(std::string("click"));
        Emit("onOverlay", map);
      }
      return 0;
    case WM_MOUSEMOVE: {
      last_move_tick_ = GetTickCount64();
      hovering_ = true;
      hover_fired_ = false;
      TRACKMOUSEEVENT track{};
      track.cbSize = sizeof(track);
      track.dwFlags = TME_LEAVE;
      track.hwndTrack = hwnd;
      TrackMouseEvent(&track);
      return 0;
    }
    case WM_MOUSELEAVE:
      hovering_ = false;
      hover_fired_ = false;
      return 0;
    case WM_TIMER:
      OnOverlayTick();
      return 0;
    case WM_DESTROY:
      KillTimer(hwnd, 1);
      return 0;
    default:
      return DefWindowProcW(hwnd, msg, wp, lp);
  }
}

void KacherNative::Impl::OnOverlayTick() {
  if (overlay_ == nullptr) return;
  if (mode_ == 2 && hovering_ && !hover_fired_ && GetTickCount64() - last_move_tick_ >= 5000) {
    hover_fired_ = true;
    flutter::EncodableMap map;
    map[flutter::EncodableValue("action")] = flutter::EncodableValue(std::string("hover"));
    Emit("onOverlay", map);
  }
  SetWindowPos(overlay_, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
  InvalidateRect(overlay_, nullptr, FALSE);
  if (mode_ == 2) {
    const unsigned second = static_cast<unsigned>(ToUs(QpcNow() - start_qpc_.load()) / 1000000ull);
    const uint32_t events = written_.load();
    if (second != last_stat_second_) {
      last_stat_second_ = second;
      flutter::EncodableMap map;
      map[flutter::EncodableValue("durationUs")] = flutter::EncodableValue(static_cast<int64_t>(ToUs(QpcNow() - start_qpc_.load())));
      map[flutter::EncodableValue("eventCount")] = flutter::EncodableValue(static_cast<int64_t>(events));
      Emit("onCaptureStats", map);
    }
  } else if (mode_ == 3) {
    const int loop = shown_loop_.load();
    const int phase = shown_phase_.load();
    const bool paused = play_pause_.load();
    if (loop != last_stat_loop_ || phase != last_stat_phase_ || paused != last_stat_paused_ ||
        static_cast<unsigned>(shown_elapsed_us_.load() / 1000000ull) != last_stat_second_) {
      last_stat_loop_ = loop;
      last_stat_phase_ = phase;
      last_stat_paused_ = paused;
      last_stat_second_ = static_cast<unsigned>(shown_elapsed_us_.load() / 1000000ull);
      flutter::EncodableMap map;
      map[flutter::EncodableValue("elapsedUs")] = flutter::EncodableValue(static_cast<int64_t>(shown_elapsed_us_.load()));
      map[flutter::EncodableValue("loop")] = flutter::EncodableValue(loop);
      map[flutter::EncodableValue("paused")] = flutter::EncodableValue(paused);
      Emit("onPlaybackStats", map);
    }
  }
}

void KacherNative::Impl::PaintOverlay(HWND hwnd) {
  PAINTSTRUCT paint{};
  HDC dc = BeginPaint(hwnd, &paint);
  RECT client{};
  GetClientRect(hwnd, &client);
  const int width = client.right > 0 ? client.right : 1;
  const int height = client.bottom > 0 ? client.bottom : 1;
  HDC memory = CreateCompatibleDC(dc);
  HBITMAP bitmap = CreateCompatibleBitmap(dc, width, height);
  HGDIOBJ old_bitmap = SelectObject(memory, bitmap);
  HBRUSH background = CreateSolidBrush(RGB(24, 26, 32));
  FillRect(memory, &client, background);
  DeleteObject(background);
  UINT dpi = GetDpiForWindow(hwnd);
  if (dpi == 0) dpi = 96;
  RECT bar = client;
  bar.right = MulDiv(4, static_cast<int>(dpi), 96);
  COLORREF accent = RGB(255, 196, 92);
  if (mode_ == 2) accent = RGB(255, 96, 96);
  if (mode_ == 3) accent = RGB(142, 180, 255);
  HBRUSH accent_brush = CreateSolidBrush(accent);
  FillRect(memory, &bar, accent_brush);
  DeleteObject(accent_brush);
  SetBkMode(memory, TRANSPARENT);
  HFONT title_font = CreateFontW(mode_ == 1 ? -MulDiv(28, static_cast<int>(dpi), 96) : -MulDiv(15, static_cast<int>(dpi), 96),
                                 0, 0, 0, FW_SEMIBOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
                                 CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, DEFAULT_PITCH, L"Segoe UI");
  HFONT body_font = CreateFontW(-MulDiv(12, static_cast<int>(dpi), 96), 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
                                DEFAULT_PITCH, L"Segoe UI");
  const int left = MulDiv(14, static_cast<int>(dpi), 96);
  RECT title_rect{left, MulDiv(8, static_cast<int>(dpi), 96), width - left, MulDiv(36, static_cast<int>(dpi), 96)};
  RECT sub_rect{left, MulDiv(34, static_cast<int>(dpi), 96), width - left, MulDiv(54, static_cast<int>(dpi), 96)};
  RECT clock_rect{left, MulDiv(54, static_cast<int>(dpi), 96), width - left, height - MulDiv(6, static_cast<int>(dpi), 96)};
  auto draw = [&](HFONT font, COLORREF color, RECT rect, const std::wstring& text) {
    HGDIOBJ old = SelectObject(memory, font);
    SetTextColor(memory, color);
    DrawTextW(memory, text.c_str(), -1, &rect, DT_LEFT | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX | DT_VCENTER);
    SelectObject(memory, old);
  };
  draw(title_font, RGB(236, 238, 242), title_rect, title_);
  std::wstring detail = subtitle_;
  if (mode_ == 3) {
    wchar_t buffer[128];
    const int loop = shown_loop_.load();
    const int total = loop_total_.load();
    if (shown_phase_.load() == 1) {
      swprintf_s(buffer, L"已完成 %d 次", loop);
    } else if (total > 0) {
      swprintf_s(buffer, L"第 %d/%d 次", loop < 1 ? 1 : loop, total);
    } else {
      swprintf_s(buffer, L"第 %d 次", loop < 1 ? 1 : loop);
    }
    detail = buffer;
    if (play_pause_.load()) detail += L" · 已暂停";
  }
  draw(body_font, RGB(170, 176, 186), sub_rect, detail);
  if (mode_ != 1) {
    wchar_t clock[32];
    const uint64_t elapsed = mode_ == 3 ? shown_elapsed_us_.load() : ToUs(QpcNow() - start_qpc_.load());
    FormatClock(clock, 32, elapsed);
    draw(title_font, accent, clock_rect, clock);
  }
  BitBlt(dc, 0, 0, width, height, memory, 0, 0, SRCCOPY);
  SelectObject(memory, old_bitmap);
  DeleteObject(title_font);
  DeleteObject(body_font);
  DeleteObject(bitmap);
  DeleteDC(memory);
  EndPaint(hwnd, &paint);
}

bool KacherNative::Impl::PushInput(uint8_t type, uint8_t flags, uint16_t code, int32_t x, int32_t y, int32_t z,
                                   int32_t w, int32_t v) {
  if (type == 1 && input_q_.Size() > 6000) {
    dropped_moves_.fetch_add(1);
    return false;
  }
  StampEvent event{};
  event.qpc = QpcNow();
  event.type = type;
  event.flags = flags;
  event.code = code;
  event.x = x;
  event.y = y;
  event.z = z;
  event.w = w;
  event.v = v;
  if (!input_q_.Push(event)) {
    if (type == 1) dropped_moves_.fetch_add(1);
    else dropped_other_.fetch_add(1);
    return false;
  }
  return true;
}

void KacherNative::Impl::PushPad(uint8_t index, uint16_t buttons, uint8_t lt, uint8_t rt, SHORT lx, SHORT ly,
                                 SHORT rx, SHORT ry) {
  StampEvent event{};
  event.qpc = QpcNow();
  event.type = 5;
  event.flags = index;
  event.code = buttons;
  event.x = lx;
  event.y = ly;
  event.z = rx;
  event.w = ry;
  event.v = static_cast<int32_t>(lt) | (static_cast<int32_t>(rt) << 16);
  pad_q_.Push(event);
}

int KacherNative::Impl::ModIndex(DWORD vk) const {
  switch (vk) {
    case VK_LCONTROL:
    case VK_CONTROL:
      return 0;
    case VK_RCONTROL:
      return 1;
    case VK_LMENU:
    case VK_MENU:
      return 2;
    case VK_RMENU:
      return 3;
    case VK_LSHIFT:
    case VK_SHIFT:
      return 4;
    case VK_RSHIFT:
      return 5;
    case VK_LWIN:
      return 6;
    case VK_RWIN:
      return 7;
    default:
      return -1;
  }
}

bool KacherNative::Impl::Chord() const {
  const bool ctrl = mods_[0].down || mods_[1].down;
  const bool alt = mods_[2].down || mods_[3].down;
  const bool shift = mods_[4].down || mods_[5].down;
  const bool win = mods_[6].down || mods_[7].down;
  return ctrl && alt && !shift && !win;
}

void KacherNative::Impl::ReleaseMods() {
  for (int i = 0; i < 8; ++i) {
    if (!mods_[i].down || !mods_[i].emitted) continue;
    const uint8_t flags = mods_[i].extended ? 2 : 0;
    PushInput(4, flags, mods_[i].vk, 0, 0, mods_[i].scan, 0, 0);
    mods_[i].emitted = false;
    mods_[i].down = false;
  }
}

bool KacherNative::Impl::OverOverlay(POINT point) const {
  if (overlay_ == nullptr || !IsWindowVisible(overlay_)) return false;
  RECT rect{};
  GetWindowRect(overlay_, &rect);
  return point.x >= rect.left && point.x < rect.right && point.y >= rect.top && point.y < rect.bottom;
}

LRESULT CALLBACK KacherNative::Impl::MouseProc(int code, WPARAM wp, LPARAM lp) {
  if (code >= 0 && self_ != nullptr) self_->HandleMouse(wp, lp);
  return CallNextHookEx(nullptr, code, wp, lp);
}

LRESULT CALLBACK KacherNative::Impl::KeyProc(int code, WPARAM wp, LPARAM lp) {
  if (code >= 0 && self_ != nullptr) {
    const auto* info = reinterpret_cast<const KBDLLHOOKSTRUCT*>(lp);
    self_->HandleKey(info);
  }
  return CallNextHookEx(nullptr, code, wp, lp);
}

void KacherNative::Impl::HandleMouse(WPARAM msg, LPARAM lp) {
  if (!capturing_.load() || blocked_.load()) return;
  const auto* info = reinterpret_cast<const MSLLHOOKSTRUCT*>(lp);
  if ((info->flags & (LLMHF_INJECTED | LLMHF_LOWER_IL_INJECTED)) != 0) return;
  if (OverOverlay(info->pt)) return;
  if (msg == WM_MOUSEMOVE) {
    if (info->pt.x == last_x_ && info->pt.y == last_y_) return;
    if (!PushInput(1, 0, 0, info->pt.x, info->pt.y, 0, 0, 0)) return;
    last_x_ = info->pt.x;
    last_y_ = info->pt.y;
    return;
  }
  uint8_t button = 0;
  uint8_t down = 0;
  switch (msg) {
    case WM_LBUTTONDOWN:
      button = 1;
      down = 1;
      break;
    case WM_LBUTTONUP:
      button = 1;
      break;
    case WM_RBUTTONDOWN:
      button = 2;
      down = 1;
      break;
    case WM_RBUTTONUP:
      button = 2;
      break;
    case WM_MBUTTONDOWN:
      button = 3;
      down = 1;
      break;
    case WM_MBUTTONUP:
      button = 3;
      break;
    case WM_XBUTTONDOWN:
    case WM_XBUTTONUP:
      button = HIWORD(info->mouseData) == XBUTTON2 ? 5 : 4;
      down = msg == WM_XBUTTONDOWN ? 1 : 0;
      break;
    case WM_MOUSEWHEEL:
      PushInput(3, 0, 0, info->pt.x, info->pt.y, 0, static_cast<short>(HIWORD(info->mouseData)), 0);
      return;
    case WM_MOUSEHWHEEL:
      PushInput(3, 0, 0, info->pt.x, info->pt.y, static_cast<short>(HIWORD(info->mouseData)), 0, 0);
      return;
    default:
      return;
  }
  if (button != 0) PushInput(2, button, down, info->pt.x, info->pt.y, 0, 0, 0);
}

void KacherNative::Impl::HandleKey(const KBDLLHOOKSTRUCT* info) {
  if (!capturing_.load() || blocked_.load()) return;
  if ((info->flags & (LLKHF_INJECTED | LLKHF_LOWER_IL_INJECTED)) != 0) return;
  const bool up = (info->flags & LLKHF_UP) != 0;
  const bool extended = (info->flags & LLKHF_EXTENDED) != 0;
  const DWORD vk = info->vkCode;
  const int mod = ModIndex(vk);
  if (mod >= 0) {
    mods_[mod].down = !up;
    mods_[mod].vk = static_cast<uint16_t>(vk);
    mods_[mod].scan = static_cast<uint16_t>(info->scanCode);
    mods_[mod].extended = extended;
  }
  const bool hot = vk == 'R' || vk == 'S' || vk == 'P' || vk == VK_SPACE;
  if (!up && Chord() && hot) {
    swallow_vk_ = static_cast<uint16_t>(vk);
    if (vk == 'S') {
      ReleaseMods();
      blocked_.store(true);
      PostToUi([this]() {
        flutter::EncodableMap map;
        map[flutter::EncodableValue("action")] = flutter::EncodableValue(std::string("stop"));
        Emit("onHotkey", map);
      });
    }
    return;
  }
  if (up && swallow_vk_ != 0 && swallow_vk_ == vk) {
    swallow_vk_ = 0;
    return;
  }
  uint8_t flags = up ? 0 : 1;
  if (extended) flags = static_cast<uint8_t>(flags | 2);
  if ((info->flags & LLKHF_ALTDOWN) != 0) flags = static_cast<uint8_t>(flags | 4);
  if (PushInput(4, flags, static_cast<uint16_t>(vk), 0, 0, static_cast<int32_t>(info->scanCode), 0, 0) && mod >= 0) {
    mods_[mod].emitted = !up;
  }
}

void KacherNative::Impl::WriteInitialHeader(FILE* file) {
  header_.version = 1;
  header_.headerSize = 4096;
  header_.eventCount = 0;
  header_.durationUs = 0;
  header_.createdUnixMs = UnixMs();
  header_.flags = 0;
  memcpy(header_.magic, "KREC", 4);
  fwrite(&header_, sizeof(header_), 1, file);
  fflush(file);
}

void KacherNative::Impl::AppendEvent(FILE* file, const StampEvent& event, uint64_t& last) {
  uint64_t delta = event.qpc >= last ? ToUs(event.qpc - last) : 0;
  if (event.qpc > last) last = event.qpc;
  while (delta > 0xffffffffull) {
    KrecEvent gap{};
    gap.dtUs = 0xffffffffu;
    gap.type = 6;
    fwrite(&gap, sizeof(gap), 1, file);
    written_.fetch_add(1);
    delta -= 0xffffffffull;
  }
  KrecEvent out{};
  out.dtUs = static_cast<uint32_t>(delta);
  out.type = event.type;
  out.flags = event.flags;
  out.code = event.code;
  out.x = event.x;
  out.y = event.y;
  out.z = event.z;
  out.w = event.w;
  out.v = event.v;
  fwrite(&out, sizeof(out), 1, file);
  written_.fetch_add(1);
  if (event.type == 5) has_pad_.store(true);
}

void KacherNative::Impl::WriteFinalHeader(FILE* file) {
  if (_fseeki64(file, 0, SEEK_SET) != 0) return;
  header_.eventCount = written_.load();
  header_.durationUs = duration_us_.load();
  header_.flags = has_pad_.load() ? 1u : 0u;
  fwrite(&header_, sizeof(header_), 1, file);
  fflush(file);
}

DWORD WINAPI KacherNative::Impl::WriterThunk(LPVOID param) { return static_cast<Impl*>(param)->WriterMain(); }
DWORD WINAPI KacherNative::Impl::HookThunk(LPVOID param) { return static_cast<Impl*>(param)->HookMain(); }
DWORD WINAPI KacherNative::Impl::PadThunk(LPVOID param) { return static_cast<Impl*>(param)->PadMain(); }
DWORD WINAPI KacherNative::Impl::PlayThunk(LPVOID param) { return static_cast<Impl*>(param)->PlayMain(); }

DWORD KacherNative::Impl::WriterMain() {
  FileCloser closer;
  if (_wfopen_s(&closer.file, capture_path_.c_str(), L"wb+") != 0 || closer.file == nullptr) {
    writer_error_.store(1);
    SetEvent(writer_ready_);
    return 1;
  }
  setvbuf(closer.file, nullptr, _IOFBF, 1 << 16);
  WriteInitialHeader(closer.file);
  SetEvent(writer_ready_);
  uint64_t last = start_qpc_.load();
  while (writer_run_.load() || input_q_.Size() > 0 || pad_q_.Size() > 0) {
    bool any = false;
    for (int i = 0; i < 64; ++i) {
      StampEvent input{};
      StampEvent pad{};
      const bool has_input = input_q_.Peek(input);
      const bool has_pad = pad_q_.Peek(pad);
      if (!has_input && !has_pad) break;
      StampEvent chosen{};
      if (has_input && (!has_pad || input.qpc <= pad.qpc)) input_q_.Pop(chosen);
      else pad_q_.Pop(chosen);
      AppendEvent(closer.file, chosen, last);
      any = true;
    }
    if (any) fflush(closer.file);
    if (!any) {
      if (!writer_run_.load() && input_q_.Size() == 0 && pad_q_.Size() == 0) break;
      WaitForSingleObject(writer_wake_, 15);
    }
  }
  WriteFinalHeader(closer.file);
  return 0;
}

DWORD KacherNative::Impl::HookMain() {
  MSG warmup{};
  PeekMessageW(&warmup, nullptr, WM_USER, WM_USER, PM_NOREMOVE);
  mouse_hook_ = SetWindowsHookExW(WH_MOUSE_LL, &Impl::MouseProc, GetModuleHandleW(nullptr), 0);
  key_hook_ = SetWindowsHookExW(WH_KEYBOARD_LL, &Impl::KeyProc, GetModuleHandleW(nullptr), 0);
  if (mouse_hook_ == nullptr || key_hook_ == nullptr) {
    if (mouse_hook_ != nullptr) UnhookWindowsHookEx(mouse_hook_);
    if (key_hook_ != nullptr) UnhookWindowsHookEx(key_hook_);
    mouse_hook_ = nullptr;
    key_hook_ = nullptr;
    hook_failed_.store(true);
    SetEvent(hook_ready_);
    return 1;
  }
  SetEvent(hook_ready_);
  MSG message{};
  while (GetMessageW(&message, nullptr, 0, 0) > 0) {
    TranslateMessage(&message);
    DispatchMessageW(&message);
  }
  UnhookWindowsHookEx(mouse_hook_);
  UnhookWindowsHookEx(key_hook_);
  mouse_hook_ = nullptr;
  key_hook_ = nullptr;
  return 0;
}

bool KacherNative::Impl::EnsureXInput() {
  if (get_state_ != nullptr) return true;
  HMODULE module = LoadLibraryW(L"xinput1_4.dll");
  if (module == nullptr) module = LoadLibraryW(L"xinput1_3.dll");
  if (module == nullptr) return false;
  get_state_ = LoadProc<XInputGetStateFn>(module, "XInputGetState");
  return get_state_ != nullptr;
}

DWORD KacherNative::Impl::PadMain() {
  EnsureXInput();
  bool online[4] = {};
  bool seen[4] = {};
  XiGamepad last[4] = {};
  ULONGLONG probed[4] = {};
  int cursor = 0;
  while (capturing_.load()) {
    if (get_state_ != nullptr) {
      for (int i = 0; i < 4; ++i) {
        if (!online[i]) continue;
        XiState state{};
        if (get_state_(static_cast<DWORD>(i), &state) != ERROR_SUCCESS) {
          online[i] = false;
          if (seen[i]) {
            seen[i] = false;
            PushPad(static_cast<uint8_t>(i), 0, 0, 0, 0, 0, 0, 0);
          }
          continue;
        }
        const XiGamepad& pad = state.pad;
        const bool changed = !seen[i] || pad.buttons != last[i].buttons ||
                             AbsInt(pad.left_trigger - last[i].left_trigger) >= 4 ||
                             AbsInt(pad.right_trigger - last[i].right_trigger) >= 4 ||
                             AbsInt(pad.thumb_lx - last[i].thumb_lx) >= 768 ||
                             AbsInt(pad.thumb_ly - last[i].thumb_ly) >= 768 ||
                             AbsInt(pad.thumb_rx - last[i].thumb_rx) >= 768 ||
                             AbsInt(pad.thumb_ry - last[i].thumb_ry) >= 768;
        if (changed) {
          seen[i] = true;
          last[i] = pad;
          online[i] = true;
          PushPad(static_cast<uint8_t>(i), pad.buttons, pad.left_trigger, pad.right_trigger, pad.thumb_lx,
                  pad.thumb_ly, pad.thumb_rx, pad.thumb_ry);
        }
      }
      const ULONGLONG now = GetTickCount64();
      for (int n = 0; n < 4; ++n) {
        const int index = cursor;
        cursor = (cursor + 1) & 3;
        if (online[index] || now - probed[index] < 500) continue;
        probed[index] = now;
        XiState state{};
        if (get_state_(static_cast<DWORD>(index), &state) == ERROR_SUCCESS) {
          online[index] = true;
          seen[index] = true;
          last[index] = state.pad;
          PushPad(static_cast<uint8_t>(index), state.pad.buttons, state.pad.left_trigger, state.pad.right_trigger,
                  state.pad.thumb_lx, state.pad.thumb_ly, state.pad.thumb_rx, state.pad.thumb_ry);
        }
        break;
      }
    }
    Sleep(16);
  }
  return 0;
}

bool KacherNative::Impl::BeginCapture(const std::wstring& path, const std::string& name, std::string& error) {
  if (phase_.load() != 0) {
    error = "正在录制或播放";
    return false;
  }
  phase_.store(1);
  capturing_.store(false);
  blocked_.store(false);
  swallow_vk_ = 0;
  for (auto& mod : mods_) mod = ModSlot{};
  last_x_ = LONG_MIN;
  last_y_ = LONG_MIN;
  written_.store(0);
  dropped_moves_.store(0);
  dropped_other_.store(0);
  has_pad_.store(false);
  writer_error_.store(0);
  hook_failed_.store(false);
  input_q_.Clear();
  pad_q_.Clear();
  header_ = KrecHeader{};
  CopyName(header_.name, sizeof(header_.name), name);
  header_.playbackMode = 0;
  header_.loopIntervalMs = 1000;
  header_.loopCount = 0;
  capture_path_ = path;
  start_qpc_.store(QpcNow());
  duration_us_.store(0);
  writer_run_.store(true);
  ResetEvent(writer_ready_);
  writer_thread_ = CreateThread(nullptr, 0, &Impl::WriterThunk, this, 0, nullptr);
  if (writer_thread_ == nullptr || WaitForSingleObject(writer_ready_, 3000) != WAIT_OBJECT_0 ||
      writer_error_.load() != 0) {
    writer_run_.store(false);
    SetEvent(writer_wake_);
    JoinThread(writer_thread_);
    DeleteFileW(path.c_str());
    phase_.store(0);
    error = "无法创建录制缓存";
    return false;
  }
  capturing_.store(true);
  ResetEvent(hook_ready_);
  hook_tid_ = 0;
  hook_thread_ = CreateThread(nullptr, 0, &Impl::HookThunk, this, 0, &hook_tid_);
  pad_thread_ = CreateThread(nullptr, 0, &Impl::PadThunk, this, 0, nullptr);
  if (hook_thread_ == nullptr || WaitForSingleObject(hook_ready_, 3000) != WAIT_OBJECT_0 || hook_failed_.load()) {
    uint32_t events = 0;
    uint64_t duration = 0;
    bool gamepad = false;
    uint32_t dropped = 0;
    StopCapture(events, duration, gamepad, dropped);
    DeleteFileW(path.c_str());
    error = "无法安装输入钩子";
    return false;
  }
  return true;
}

void KacherNative::Impl::StopCapture(uint32_t& events, uint64_t& duration, bool& gamepad, uint32_t& dropped) {
  if (phase_.load() != 1 && writer_thread_ == nullptr && hook_thread_ == nullptr) {
    events = 0;
    duration = 0;
    gamepad = false;
    dropped = 0;
    return;
  }
  capturing_.store(false);
  JoinThread(pad_thread_);
  if (hook_tid_ != 0) {
    for (int i = 0; i < 20 && !PostThreadMessageW(hook_tid_, WM_QUIT, 0, 0); ++i) Sleep(10);
  }
  JoinThread(hook_thread_);
  hook_tid_ = 0;
  const uint64_t start = start_qpc_.load();
  const uint64_t now = QpcNow();
  duration_us_.store(now >= start ? ToUs(now - start) : 0);
  writer_run_.store(false);
  if (writer_wake_ != nullptr) SetEvent(writer_wake_);
  JoinThread(writer_thread_);
  events = written_.load();
  duration = duration_us_.load();
  gamepad = has_pad_.load();
  dropped = dropped_moves_.load() + dropped_other_.load();
  phase_.store(0);
}

bool KacherNative::Impl::EnsureTarget(int index) {
  if (index < 0 || index > 3 || vigem_client_ == nullptr) return false;
  if (vigem_targets_[index] != nullptr) return true;
  void* target = vigem_target_alloc_();
  if (target == nullptr) return false;
  if (vigem_target_add_(vigem_client_, target) != kVigemOk) {
    vigem_target_free_(target);
    return false;
  }
  vigem_targets_[index] = target;
  return true;
}

bool KacherNative::Impl::StartViGEm() {
  if (vigem_client_ != nullptr) return true;
  if (vigem_module_ == nullptr) {
    const std::wstring local = DirOf(ExePath()) + L"\\ViGEmClient.dll";
    vigem_module_ = LoadLibraryW(local.c_str());
    if (vigem_module_ == nullptr) vigem_module_ = LoadLibraryW(L"ViGEmClient.dll");
  }
  if (vigem_module_ == nullptr) return false;
  vigem_alloc_ = LoadProc<VigemAllocFn>(vigem_module_, "vigem_alloc");
  vigem_free_ = LoadProc<VigemFreeFn>(vigem_module_, "vigem_free");
  vigem_connect_ = LoadProc<VigemConnectFn>(vigem_module_, "vigem_connect");
  vigem_disconnect_ = LoadProc<VigemDisconnectFn>(vigem_module_, "vigem_disconnect");
  vigem_target_alloc_ = LoadProc<VigemTargetAllocFn>(vigem_module_, "vigem_target_x360_alloc");
  vigem_target_free_ = LoadProc<VigemTargetFreeFn>(vigem_module_, "vigem_target_free");
  vigem_target_add_ = LoadProc<VigemTargetAddFn>(vigem_module_, "vigem_target_add");
  vigem_target_remove_ = LoadProc<VigemTargetRemoveFn>(vigem_module_, "vigem_target_remove");
  vigem_update_ = LoadProc<VigemUpdateFn>(vigem_module_, "vigem_target_x360_update");
  if (vigem_alloc_ == nullptr || vigem_connect_ == nullptr || vigem_update_ == nullptr) return false;
  vigem_client_ = vigem_alloc_();
  if (vigem_client_ == nullptr) return false;
  if (vigem_connect_(vigem_client_) != kVigemOk) {
    vigem_free_(vigem_client_);
    vigem_client_ = nullptr;
    return false;
  }
  return true;
}

void KacherNative::Impl::NeutralPads() {
  if (vigem_client_ == nullptr || vigem_update_ == nullptr) return;
  XusbReport report{};
  for (int i = 0; i < 4; ++i) {
    if (vigem_targets_[i] != nullptr) vigem_update_(vigem_client_, vigem_targets_[i], report);
  }
}

void KacherNative::Impl::StopViGEm() {
  NeutralPads();
  if (vigem_client_ == nullptr) return;
  for (int i = 0; i < 4; ++i) {
    if (vigem_targets_[i] == nullptr) continue;
    if (vigem_target_remove_ != nullptr) vigem_target_remove_(vigem_client_, vigem_targets_[i]);
    if (vigem_target_free_ != nullptr) vigem_target_free_(vigem_targets_[i]);
    vigem_targets_[i] = nullptr;
  }
  if (vigem_disconnect_ != nullptr) vigem_disconnect_(vigem_client_);
  if (vigem_free_ != nullptr) vigem_free_(vigem_client_);
  vigem_client_ = nullptr;
}

void KacherNative::Impl::SendMouse(int x, int y, DWORD flags, DWORD data) {
  const int origin_x = GetSystemMetrics(SM_XVIRTUALSCREEN);
  const int origin_y = GetSystemMetrics(SM_YVIRTUALSCREEN);
  const int width = GetSystemMetrics(SM_CXVIRTUALSCREEN);
  const int height = GetSystemMetrics(SM_CYVIRTUALSCREEN);
  INPUT input{};
  input.type = INPUT_MOUSE;
  input.mi.dx = NormCoord(x, origin_x, width);
  input.mi.dy = NormCoord(y, origin_y, height);
  input.mi.mouseData = data;
  input.mi.dwFlags = flags | MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK;
  SendInput(1, &input, sizeof(INPUT));
  last_mouse_x_ = x;
  last_mouse_y_ = y;
  have_mouse_ = true;
}

void KacherNative::Impl::SendKey(WORD vk, WORD scan, bool down, bool extended) {
  INPUT input{};
  input.type = INPUT_KEYBOARD;
  if (scan != 0) {
    input.ki.wScan = scan;
    input.ki.dwFlags = KEYEVENTF_SCANCODE;
  } else {
    input.ki.wVk = vk;
  }
  if (!down) input.ki.dwFlags |= KEYEVENTF_KEYUP;
  if (extended) input.ki.dwFlags |= KEYEVENTF_EXTENDEDKEY;
  SendInput(1, &input, sizeof(INPUT));
  if (vk < 256) {
    held_[vk].down = down;
    held_[vk].vk = vk;
    held_[vk].scan = scan;
    held_[vk].extended = extended;
  }
}

void KacherNative::Impl::ReleaseHeld() {
  for (int i = 0; i < 256; ++i) {
    if (held_[i].down) SendKey(held_[i].vk, held_[i].scan, false, held_[i].extended);
  }
  for (int button = 1; button <= 5; ++button) {
    if ((mouse_mask_ & (1u << button)) == 0) continue;
    DWORD flag = MOUSEEVENTF_LEFTUP;
    DWORD data = 0;
    if (button == 2) flag = MOUSEEVENTF_RIGHTUP;
    if (button == 3) flag = MOUSEEVENTF_MIDDLEUP;
    if (button == 4) {
      flag = MOUSEEVENTF_XUP;
      data = XBUTTON1;
    }
    if (button == 5) {
      flag = MOUSEEVENTF_XUP;
      data = XBUTTON2;
    }
    SendMouse(last_mouse_x_, last_mouse_y_, flag, data);
  }
  mouse_mask_ = 0;
  NeutralPads();
}

void KacherNative::Impl::Dispatch(const KrecEvent& event) {
  if (event.type == 1) {
    SendMouse(event.x, event.y, 0, 0);
    return;
  }
  if (event.type == 2) {
    DWORD flag = 0;
    DWORD data = 0;
    const bool down = event.code != 0;
    switch (event.flags) {
      case 1:
        flag = down ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP;
        break;
      case 2:
        flag = down ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_RIGHTUP;
        break;
      case 3:
        flag = down ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_MIDDLEUP;
        break;
      case 4:
        flag = down ? MOUSEEVENTF_XDOWN : MOUSEEVENTF_XUP;
        data = XBUTTON1;
        break;
      case 5:
        flag = down ? MOUSEEVENTF_XDOWN : MOUSEEVENTF_XUP;
        data = XBUTTON2;
        break;
      default:
        return;
    }
    if (down) mouse_mask_ = static_cast<uint8_t>(mouse_mask_ | (1u << event.flags));
    else mouse_mask_ = static_cast<uint8_t>(mouse_mask_ & ~(1u << event.flags));
    SendMouse(event.x, event.y, flag, data);
    return;
  }
  if (event.type == 3) {
    if (event.w != 0) SendMouse(event.x, event.y, MOUSEEVENTF_WHEEL, static_cast<DWORD>(event.w));
    if (event.z != 0) SendMouse(event.x, event.y, MOUSEEVENTF_HWHEEL, static_cast<DWORD>(event.z));
    return;
  }
  if (event.type == 4) {
    SendKey(event.code, static_cast<WORD>(event.z), (event.flags & 1) != 0, (event.flags & 2) != 0);
    return;
  }
  if (event.type == 5) {
    if (vigem_client_ == nullptr || vigem_update_ == nullptr) return;
    const int index = event.flags;
    if (!EnsureTarget(index)) return;
    XusbReport report{};
    report.buttons = event.code;
    report.left_trigger = static_cast<BYTE>(event.v & 0xff);
    report.right_trigger = static_cast<BYTE>((event.v >> 16) & 0xff);
    report.thumb_lx = static_cast<SHORT>(event.x);
    report.thumb_ly = static_cast<SHORT>(event.y);
    report.thumb_rx = static_cast<SHORT>(event.z);
    report.thumb_ry = static_cast<SHORT>(event.w);
    vigem_update_(vigem_client_, vigem_targets_[index], report);
  }
}

void KacherNative::Impl::WaitUntil(uint64_t origin, uint64_t target) {
  while (!play_stop_.load()) {
    if (play_pause_.load()) {
      const uint64_t began = QpcNow();
      while (play_pause_.load() && !play_stop_.load()) WaitForSingleObject(play_wake_, 30);
      pause_us_ += ToUs(QpcNow() - began);
      continue;
    }
    const uint64_t elapsed = ToUs(QpcNow() - origin);
    const uint64_t played = elapsed > pause_us_ ? elapsed - pause_us_ : 0;
    shown_elapsed_us_.store(played);
    if (played >= target) return;
    const uint64_t remain = target - played;
    if (remain > 20000) {
      DWORD wait = static_cast<DWORD>((remain - 5000) / 1000);
      if (wait > 40) wait = 40;
      if (wait < 1) wait = 1;
      WaitForSingleObject(play_wake_, wait);
    } else if (remain > 2000) {
      Sleep(1);
    } else {
      YieldProcessor();
    }
  }
}

void KacherNative::Impl::WaitMs(uint32_t milliseconds) {
  const uint64_t origin = QpcNow();
  uint64_t paused = 0;
  const uint64_t target = static_cast<uint64_t>(milliseconds) * 1000ull;
  while (!play_stop_.load()) {
    if (play_pause_.load()) {
      const uint64_t began = QpcNow();
      while (play_pause_.load() && !play_stop_.load()) WaitForSingleObject(play_wake_, 30);
      paused += ToUs(QpcNow() - began);
      continue;
    }
    const uint64_t elapsed = ToUs(QpcNow() - origin);
    const uint64_t played = elapsed > paused ? elapsed - paused : 0;
    if (played >= target) return;
    WaitForSingleObject(play_wake_, 20);
  }
}

void KacherNative::Impl::PlayStream(FILE* file, uint64_t duration) {
  const uint64_t origin = QpcNow();
  pause_us_ = 0;
  uint64_t cursor = 0;
  KrecEvent event{};
  while (!play_stop_.load() && fread(&event, sizeof(event), 1, file) == 1) {
    cursor += event.dtUs;
    WaitUntil(origin, cursor);
    if (play_stop_.load()) break;
    Dispatch(event);
  }
  if (!play_stop_.load() && duration > cursor) WaitUntil(origin, duration);
}

DWORD KacherNative::Impl::PlayMain() {
  FileCloser closer;
  if (_wfopen_s(&closer.file, play_path_.c_str(), L"rb") != 0 || closer.file == nullptr) {
    play_error_.store(1);
    SetEvent(play_ready_);
    phase_.store(0);
    return 1;
  }
  KrecHeader header{};
  if (fread(&header, sizeof(header), 1, closer.file) != 1 || memcmp(header.magic, "KREC", 4) != 0) {
    play_error_.store(2);
    SetEvent(play_ready_);
    phase_.store(0);
    return 1;
  }
  bool skipped = false;
  if ((header.flags & 1u) != 0 && !StartViGEm()) skipped = true;
  gamepad_skipped_.store(skipped);
  SetEvent(play_ready_);
  int finished = 0;
  const int total = loop_total_.load();
  while (!play_stop_.load()) {
    ++finished;
    shown_loop_.store(finished);
    shown_phase_.store(0);
    shown_elapsed_us_.store(0);
    memset(held_, 0, sizeof(held_));
    mouse_mask_ = 0;
    if (_fseeki64(closer.file, 4096, SEEK_SET) != 0) break;
    PlayStream(closer.file, header.durationUs);
    ReleaseHeld();
    if (play_stop_.load()) break;
    if (play_after_ != 2) break;
    if (total > 0 && finished >= total) break;
    shown_phase_.store(1);
    WaitMs(play_interval_);
  }
  StopViGEm();
  const bool stopped = play_stop_.load();
  const int after = play_after_;
  const int64_t token = play_token_;
  phase_.store(0);
  PostToUi([this, stopped, after, token]() {
    flutter::EncodableMap map;
    map[flutter::EncodableValue("reason")] = flutter::EncodableValue(std::string(stopped ? "stopped" : "finished"));
    map[flutter::EncodableValue("after")] = flutter::EncodableValue(after);
    map[flutter::EncodableValue("token")] = flutter::EncodableValue(token);
    Emit("onPlaybackDone", map);
    if (play_thread_ != nullptr) {
      CloseHandle(play_thread_);
      play_thread_ = nullptr;
    }
  });
  return 0;
}

bool KacherNative::Impl::Play(const std::wstring& path, int after, uint32_t interval, uint32_t count, int64_t token,
                              bool& skipped, std::string& error) {
  if (phase_.load() != 0 || play_thread_ != nullptr) {
    error = "正在录制或播放";
    return false;
  }
  play_path_ = path;
  play_after_ = after;
  play_interval_ = interval;
  loop_total_.store(static_cast<int>(count));
  play_token_ = token;
  play_stop_.store(false);
  play_pause_.store(false);
  play_error_.store(0);
  gamepad_skipped_.store(false);
  shown_loop_.store(0);
  shown_phase_.store(0);
  shown_elapsed_us_.store(0);
  phase_.store(2);
  ResetEvent(play_ready_);
  play_thread_ = CreateThread(nullptr, 0, &Impl::PlayThunk, this, 0, nullptr);
  if (play_thread_ == nullptr || WaitForSingleObject(play_ready_, 3000) != WAIT_OBJECT_0 || play_error_.load() != 0) {
    play_stop_.store(true);
    if (play_wake_ != nullptr) SetEvent(play_wake_);
    JoinThread(play_thread_);
    phase_.store(0);
    error = play_error_.load() == 2 ? "录制文件已损坏" : "无法打开录制文件";
    return false;
  }
  skipped = gamepad_skipped_.load();
  return true;
}

void KacherNative::Impl::StopPlayback() {
  if (play_thread_ == nullptr) return;
  play_stop_.store(true);
  if (play_wake_ != nullptr) SetEvent(play_wake_);
  JoinThread(play_thread_);
  phase_.store(0);
}

void KacherNative::Impl::SetPaused(bool paused) { play_pause_.store(paused); if (play_wake_ != nullptr) SetEvent(play_wake_); }

bool KacherNative::Impl::UpdateMeta(const std::wstring& path, const std::string& name, uint32_t mode, uint32_t interval,
                                    uint32_t count, bool repair) {
  HANDLE file = CreateFileW(path.c_str(), GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr,
                            OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (file == INVALID_HANDLE_VALUE) return false;
  KrecHeader header{};
  DWORD read = 0;
  if (!ReadFile(file, &header, sizeof(header), &read, nullptr) || read != sizeof(header) ||
      memcmp(header.magic, "KREC", 4) != 0) {
    CloseHandle(file);
    return false;
  }
  if (repair) {
    uint32_t events = 0;
    uint64_t sum = 0;
    uint32_t flags = header.flags;
    KrecEvent event{};
    DWORD got = 0;
    while (ReadFile(file, &event, sizeof(event), &got, nullptr) && got == sizeof(event)) {
      ++events;
      sum += event.dtUs;
      if (event.type == 5) flags |= 1u;
    }
    header.eventCount = events;
    if (header.durationUs == 0) header.durationUs = sum;
    header.flags = flags;
  }
  CopyName(header.name, sizeof(header.name), name);
  header.playbackMode = mode;
  header.loopIntervalMs = interval;
  header.loopCount = count;
  SetFilePointer(file, 0, nullptr, FILE_BEGIN);
  DWORD wrote = 0;
  const BOOL ok = WriteFile(file, &header, sizeof(header), &wrote, nullptr);
  CloseHandle(file);
  return ok && wrote == sizeof(header);
}

bool KacherNative::Impl::SetStartup(bool enabled) {
  const std::wstring path = ExePath();
  if (path.empty()) return false;
  HKEY key = nullptr;
  if (RegOpenKeyExW(HKEY_CURRENT_USER, L"Software\\Microsoft\\Windows\\CurrentVersion\\Run", 0, KEY_SET_VALUE, &key) !=
      ERROR_SUCCESS) {
    return false;
  }
  LONG status = ERROR_SUCCESS;
  if (enabled) {
    const std::wstring value = L"\"" + path + L"\"";
    status = RegSetValueExW(key, L"Kacher", 0, REG_SZ, reinterpret_cast<const BYTE*>(value.c_str()),
                            static_cast<DWORD>((value.size() + 1) * sizeof(wchar_t)));
  } else {
    status = RegDeleteValueW(key, L"Kacher");
    if (status == ERROR_FILE_NOT_FOUND) status = ERROR_SUCCESS;
  }
  RegCloseKey(key);
  return status == ERROR_SUCCESS;
}

bool KacherNative::Impl::Shutdown() {
  HANDLE token = nullptr;
  if (OpenProcessToken(GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &token)) {
    TOKEN_PRIVILEGES privileges{};
    privileges.PrivilegeCount = 1;
    privileges.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;
    if (LookupPrivilegeValueW(nullptr, SE_SHUTDOWN_NAME, &privileges.Privileges[0].Luid)) {
      AdjustTokenPrivileges(token, FALSE, &privileges, 0, nullptr, nullptr);
    }
    CloseHandle(token);
  }
  return ExitWindowsEx(EWX_SHUTDOWN | EWX_POWEROFF,
                       SHTDN_REASON_MAJOR_APPLICATION | SHTDN_REASON_FLAG_PLANNED) != FALSE;
}

void KacherNative::Impl::Handle(const flutter::MethodCall<flutter::EncodableValue>& call,
                                std::unique_ptr<flutter::MethodResult<flutter::EncodableValue>> result) {
  const std::string& method = call.method_name();
  const auto* args = call.arguments() == nullptr ? nullptr : std::get_if<flutter::EncodableMap>(call.arguments());
  if (method == "exeDir") {
    result->Success(flutter::EncodableValue(WideToUtf8(DirOf(ExePath()))));
    return;
  }
  if (method == "fileVersion") {
    result->Success(flutter::EncodableValue(ReadFileVersion(ExePath())));
    return;
  }
  if (method == "readFileVersion") {
    result->Success(flutter::EncodableValue(ReadFileVersion(Utf8ToWide(ArgString(args, "path")))));
    return;
  }
  if (method == "setStartup") {
    result->Success(flutter::EncodableValue(SetStartup(ArgBool(args, "enabled"))));
    return;
  }
  if (method == "minimize") {
    if (hwnd_ != nullptr) ShowWindow(hwnd_, SW_MINIMIZE);
    result->Success();
    return;
  }
  if (method == "restore") {
    if (hwnd_ != nullptr) {
      ShowWindow(hwnd_, SW_RESTORE);
      SetForegroundWindow(hwnd_);
    }
    result->Success();
    return;
  }
  if (method == "showOverlay" || method == "updateOverlay") {
    const std::string mode = ArgString(args, "mode");
    int numeric = mode_;
    if (mode == "countdown") numeric = 1;
    else if (mode == "recording") numeric = 2;
    else if (mode == "playing") numeric = 3;
    if (method == "updateOverlay") numeric = mode_;
    ShowOverlay(numeric, Utf8ToWide(ArgString(args, "title")), Utf8ToWide(ArgString(args, "subtitle")));
    result->Success();
    return;
  }
  if (method == "hideOverlay") {
    HideOverlay();
    result->Success();
    return;
  }
  if (method == "beginCapture") {
    std::string error;
    if (!BeginCapture(Utf8ToWide(ArgString(args, "path")), ArgString(args, "name"), error)) {
      result->Error("capture", error);
      return;
    }
    result->Success();
    return;
  }
  if (method == "endCapture") {
    uint32_t events = 0;
    uint64_t duration = 0;
    bool gamepad = false;
    uint32_t dropped = 0;
    StopCapture(events, duration, gamepad, dropped);
    flutter::EncodableMap map;
    map[flutter::EncodableValue("eventCount")] = flutter::EncodableValue(static_cast<int64_t>(events));
    map[flutter::EncodableValue("durationUs")] = flutter::EncodableValue(static_cast<int64_t>(duration));
    map[flutter::EncodableValue("hasGamepad")] = flutter::EncodableValue(gamepad);
    map[flutter::EncodableValue("dropped")] = flutter::EncodableValue(static_cast<int64_t>(dropped));
    result->Success(flutter::EncodableValue(map));
    return;
  }
  if (method == "play") {
    bool skipped = false;
    std::string error;
    const bool ok = Play(Utf8ToWide(ArgString(args, "path")), static_cast<int>(ArgInt(args, "after")),
                         static_cast<uint32_t>(ArgInt(args, "intervalMs")), static_cast<uint32_t>(ArgInt(args, "count")),
                         ArgInt(args, "token"), skipped, error);
    if (!ok) {
      result->Error("play", error);
      return;
    }
    flutter::EncodableMap map;
    map[flutter::EncodableValue("gamepadSkipped")] = flutter::EncodableValue(skipped);
    result->Success(flutter::EncodableValue(map));
    return;
  }
  if (method == "setPaused") {
    SetPaused(ArgBool(args, "paused"));
    result->Success();
    return;
  }
  if (method == "stopPlayback") {
    StopPlayback();
    result->Success();
    return;
  }
  if (method == "shutdown") {
    result->Success(flutter::EncodableValue(Shutdown()));
    return;
  }
  if (method == "updateMeta") {
    const bool ok = UpdateMeta(Utf8ToWide(ArgString(args, "path")), ArgString(args, "name"),
                               static_cast<uint32_t>(ArgInt(args, "playbackMode")),
                               static_cast<uint32_t>(ArgInt(args, "loopIntervalMs")),
                               static_cast<uint32_t>(ArgInt(args, "loopCount")), ArgBool(args, "repair"));
    if (!ok) {
      result->Error("meta", "无法写入录制文件");
      return;
    }
    result->Success();
    return;
  }
  result->NotImplemented();
}

KacherNative::KacherNative() : impl_(std::make_unique<Impl>()) {}
KacherNative::~KacherNative() = default;

KacherNative& KacherNative::Instance() {
  static KacherNative instance;
  return instance;
}

void KacherNative::Attach(void* messenger, HWND hwnd) {
  impl_->Attach(static_cast<flutter::BinaryMessenger*>(messenger), hwnd);
}

void KacherNative::Detach() { impl_->Detach(); }
void KacherNative::DrainUi() { impl_->DrainUi(); }
void KacherNative::OnHotkey(WPARAM id) { impl_->OnHotkey(id); }
