import 'dart:ffi' as ffi;
import 'dart:io' show Platform, Directory;
import 'package:path/path.dart' as path;

typedef dmc_world_func = ffi.Void Function();
typedef DMC = void Function();

void main() {
  var libraryPath =
      path.join(Directory.current.path, 'dmc_library', 'libdmc.so');
  if (Platform.isMacOS) {
    libraryPath =
        path.join(Directory.current.path, 'dmc_library', 'libdmc.dylib');
  } else if (Platform.isWindows) {
    libraryPath =
        path.join(Directory.current.path, 'dmc_library', 'Debug', 'dmc.dll');
  }
  print(libraryPath);
}
