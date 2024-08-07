import 'package:crct/store/use_win.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';

class WinEvent extends StatefulWidget {
  const WinEvent({super.key});
  @override
  State<WinEvent> createState() => _WinEvent();
}

class _WinEvent extends State<WinEvent> with WindowListener {
  late UseWin _useWinR;

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    _useWinR = context.read<UseWin>();
    windowManager.getBounds().then((rect) {
      _useWinR.winSize(rect.width, rect.height);
      _useWinR.winPosition(rect.left, rect.top);
    });
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    super.dispose();
  }

  @override
  void onWindowResize() {
    windowManager.getBounds().then((rect) {
      _useWinR.winSize(rect.width, rect.height);
    });
  }

  @override
  void onWindowMoved() {
    windowManager.getBounds().then((rect) {
      _useWinR.winPosition(rect.left, rect.top);
    });
  }

  @override
  Widget build(BuildContext context) {
    var u = context.watch<UseWin>();
    var x = u.x;
    var y = u.y;
    var w = u.width;
    var h = u.height;
    return Text(
        '${x.toString()}_${y.toString()}_${w.toString()}_${h.toString()}');
  }
}
