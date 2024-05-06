import 'package:feriea/currency_switch_bar.dart';
import 'package:feriea/currency_view_box.dart';
import 'package:flutter/material.dart';

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          backgroundColor: Theme.of(context).colorScheme.inversePrimary,
          title: Text(widget.title, style: const TextStyle(fontSize: 14)),
          toolbarHeight: 28,
        ),
        body: LayoutBuilder(builder: (context, constraints) {
          return Column(
            children: [
              Container(
                color: Colors.transparent,
                child: const CurrencySwitchBar(),
              ),
              Container(
                  height: constraints.maxHeight - 100,
                  color: Colors.transparent,
                  child: SingleChildScrollView(
                    child: CurrencyViewBox(constraints: constraints),
                  ))
            ],
          );
        }));
  }
}
