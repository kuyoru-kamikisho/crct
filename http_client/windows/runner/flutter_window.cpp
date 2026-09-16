#include "flutter_window.h"

#include <flutter/method_channel.h>
#include <flutter/standard_method_codec.h>

#include <optional>

#include "flutter/generated_plugin_registrant.h"

namespace {

FlutterWindow* g_flutter_window = nullptr;
WNDPROC g_original_view_proc = nullptr;

bool IsWinKeyDown() {
  return (GetAsyncKeyState(VK_LWIN) & 0x8000) != 0 ||
         (GetAsyncKeyState(VK_RWIN) & 0x8000) != 0;
}

LRESULT CALLBACK FlutterViewWndProc(HWND hwnd, UINT message, WPARAM wparam,
                                    LPARAM lparam) {
  if (message == WM_PASTE && g_flutter_window != nullptr) {
    g_flutter_window->NotifyPaste();
    return 0;
  }
  if (g_original_view_proc != nullptr) {
    return CallWindowProc(g_original_view_proc, hwnd, message, wparam, lparam);
  }
  return DefWindowProc(hwnd, message, wparam, lparam);
}

}  // namespace

FlutterWindow::FlutterWindow(const flutter::DartProject& project)
    : project_(project) {}

FlutterWindow::~FlutterWindow() {}

bool FlutterWindow::OnCreate() {
  if (!Win32Window::OnCreate()) {
    return false;
  }

  RECT frame = GetClientArea();

  // The size here must match the window dimensions to avoid unnecessary surface
  // creation / destruction in the startup path.
  flutter_controller_ = std::make_unique<flutter::FlutterViewController>(
      frame.right - frame.left, frame.bottom - frame.top, project_);
  // Ensure that basic setup of the controller was successful.
  if (!flutter_controller_->engine() || !flutter_controller_->view()) {
    return false;
  }
  RegisterPlugins(flutter_controller_->engine());
  SetChildContent(flutter_controller_->view()->GetNativeWindow());

  view_hwnd_ = flutter_controller_->view()->GetNativeWindow();
  if (view_hwnd_) {
    g_flutter_window = this;
    original_view_proc_ = reinterpret_cast<WNDPROC>(SetWindowLongPtr(
        view_hwnd_, GWLP_WNDPROC, reinterpret_cast<LONG_PTR>(FlutterViewWndProc)));
    g_original_view_proc = original_view_proc_;
  }

  flutter_controller_->engine()->SetNextFrameCallback([&]() {
    this->Show();
  });

  // Flutter can complete the first frame before the "show window" callback is
  // registered. The following call ensures a frame is pending to ensure the
  // window is shown. It is a no-op if the first frame hasn't completed yet.
  flutter_controller_->ForceRedraw();

  return true;
}

void FlutterWindow::OnDestroy() {
  if (view_hwnd_ && original_view_proc_ && IsWindow(view_hwnd_)) {
    SetWindowLongPtr(view_hwnd_, GWLP_WNDPROC,
                     reinterpret_cast<LONG_PTR>(original_view_proc_));
  }
  original_view_proc_ = nullptr;
  g_original_view_proc = nullptr;
  view_hwnd_ = nullptr;
  g_flutter_window = nullptr;

  if (flutter_controller_) {
    flutter_controller_ = nullptr;
  }

  Win32Window::OnDestroy();
}

void FlutterWindow::NotifyPaste() { InvokeDartMethod("paste"); }

void FlutterWindow::NotifyFocus() { InvokeDartMethod("focus"); }

void FlutterWindow::InvokeDartMethod(const char* method) {
  if (!flutter_controller_ || !flutter_controller_->engine()) {
    return;
  }
  flutter::MethodChannel<flutter::EncodableValue> channel(
      flutter_controller_->engine()->messenger(), "http_client/window",
      &flutter::StandardMethodCodec::GetInstance());
  channel.InvokeMethod(method, nullptr);
}

bool FlutterWindow::IsWinV(WPARAM wparam) const {
  return (wparam == 'V' || wparam == 'v') && IsWinKeyDown();
}

LRESULT
FlutterWindow::MessageHandler(HWND hwnd, UINT const message,
                              WPARAM const wparam,
                              LPARAM const lparam) noexcept {
  if (message == WM_PASTE) {
    NotifyPaste();
    return 0;
  }

  if (message == WM_ACTIVATE && LOWORD(wparam) != WA_INACTIVE) {
    NotifyFocus();
  }

  // Do not let Flutter consume Win+V so Windows Clipboard History can open.
  if ((message == WM_KEYDOWN || message == WM_SYSKEYDOWN ||
       message == WM_KEYUP || message == WM_SYSKEYUP || message == WM_CHAR ||
       message == WM_SYSCHAR) &&
      IsWinV(wparam)) {
    return Win32Window::MessageHandler(hwnd, message, wparam, lparam);
  }

  // Give Flutter, including plugins, an opportunity to handle window messages.
  if (flutter_controller_) {
    std::optional<LRESULT> result =
        flutter_controller_->HandleTopLevelWindowProc(hwnd, message, wparam,
                                                      lparam);
    if (result) {
      return *result;
    }
  }

  switch (message) {
    case WM_FONTCHANGE:
      flutter_controller_->engine()->ReloadSystemFonts();
      break;
  }

  return Win32Window::MessageHandler(hwnd, message, wparam, lparam);
}
