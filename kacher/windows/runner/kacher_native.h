#ifndef RUNNER_KACHER_NATIVE_H_
#define RUNNER_KACHER_NATIVE_H_

#include <windows.h>

#include <memory>

// Posted to the Flutter window when background threads have UI work.
constexpr UINT WM_KACHER_NOTIFY = WM_APP + 41;

// Native capabilities for the Flutter UI: single-process input capture,
// playback, overlay, hotkeys, startup registration, and file version.
class KacherNative {
 public:
  static KacherNative& Instance();

  void Attach(void* messenger, HWND hwnd);
  void Detach();
  void DrainUi();
  void OnHotkey(WPARAM id);

  KacherNative(const KacherNative&) = delete;
  KacherNative& operator=(const KacherNative&) = delete;

 private:
  class Impl;

  KacherNative();
  ~KacherNative();

  std::unique_ptr<Impl> impl_;
};

#endif  // RUNNER_KACHER_NATIVE_H_
