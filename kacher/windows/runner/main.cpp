#include <flutter/dart_project.h>
#include <flutter/flutter_view_controller.h>
#include <windows.h>

#include "flutter_window.h"
#include "utils.h"

namespace {

HANDLE g_single_instance = nullptr;

void ActivateExistingWindow() {
  HWND hwnd = ::FindWindowW(L"FLUTTER_RUNNER_WIN32_WINDOW", L"Kacher");
  if (hwnd == nullptr) {
    return;
  }
  ::ShowWindow(hwnd, SW_RESTORE);
  HWND foreground = ::GetForegroundWindow();
  DWORD foreground_thread = ::GetWindowThreadProcessId(foreground, nullptr);
  DWORD this_thread = ::GetCurrentThreadId();
  if (foreground_thread != 0 && foreground_thread != this_thread) {
    ::AttachThreadInput(this_thread, foreground_thread, TRUE);
  }
  ::SetForegroundWindow(hwnd);
  ::BringWindowToTop(hwnd);
  if (foreground_thread != 0 && foreground_thread != this_thread) {
    ::AttachThreadInput(this_thread, foreground_thread, FALSE);
  }
}

bool AcquireSingleInstance() {
  g_single_instance = ::CreateMutexW(nullptr, TRUE, L"Local\\Kacher.SingleInstance");
  if (g_single_instance == nullptr) {
    return true;
  }
  if (::GetLastError() == ERROR_ALREADY_EXISTS) {
    ActivateExistingWindow();
    ::CloseHandle(g_single_instance);
    g_single_instance = nullptr;
    return false;
  }
  return true;
}

}  // namespace

int APIENTRY wWinMain(_In_ HINSTANCE instance, _In_opt_ HINSTANCE prev,
                      _In_ wchar_t *command_line, _In_ int show_command) {
  // Attach to console when present (e.g., 'flutter run') or create a
  // new console when running with a debugger.
  if (!::AttachConsole(ATTACH_PARENT_PROCESS) && ::IsDebuggerPresent()) {
    CreateAndAttachConsole();
  }

  // Initialize COM, so that it is available for use in the library and/or
  // plugins.
  ::CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

  if (!AcquireSingleInstance()) {
    ::CoUninitialize();
    return EXIT_SUCCESS;
  }

  flutter::DartProject project(L"data");

  std::vector<std::string> command_line_arguments =
      GetCommandLineArguments();

  project.set_dart_entrypoint_arguments(std::move(command_line_arguments));

  FlutterWindow window(project);
  Win32Window::Point origin(80, 40);
  Win32Window::Size size(1080, 700);
  if (!window.Create(L"Kacher", origin, size)) {
    return EXIT_FAILURE;
  }
  window.SetQuitOnClose(true);

  ::MSG msg;
  while (::GetMessage(&msg, nullptr, 0, 0)) {
    ::TranslateMessage(&msg);
    ::DispatchMessage(&msg);
  }

  ::CoUninitialize();
  return EXIT_SUCCESS;
}
