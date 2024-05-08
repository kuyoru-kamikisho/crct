import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  var hstyle = const TextStyle(fontSize: 18, fontWeight: FontWeight.w600);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: DefaultTabController(
            initialIndex: 0,
            length: 3,
            child: Scaffold(
              appBar: const TabBar(tabs: [
                Tab(
                  text: '批判性思维',
                ),
                Tab(
                  text: '逆向思维',
                ),
                Tab(
                  text: '结构化思维',
                ),
              ]),
              body: TabBarView(
                children: [
                  SelectableText.rich(TextSpan(
                      style: const TextStyle(fontSize: 14, color: Colors.black),
                      children: [
                        TextSpan(text: '\nWhy（为什么重要？）\n', style: hstyle),
                        const TextSpan(
                            text:
                                '       批判性思维就像是一个超级英雄，它帮助我们分辨哪些信息是真的，哪些是假的，让我们做出更好的选择。'),
                        TextSpan(text: '\n\nWhat（是什么？）\n', style: hstyle),
                        const TextSpan(
                            text:
                                '        批判性思维就是我们用大脑去仔细检查信息，就像我们用眼睛检查食物干不干净一样。'),
                        TextSpan(text: '\n\nHow（怎么做？）\n', style: hstyle),
                        const TextSpan(text: '''
        - 问问题：当你听到或看到一些信息时，问问自己，这是真的吗？
        - 找证据：像侦探一样，寻找线索证明这个信息是对的。
        - 想想为什么：想想为什么别人会这么说，他们是不是有道理。
        - 听听别人怎么说：看看别人怎么想的，他们有没有更好的主意。
        - 再想想：最后，再想想自己是不是同意这个信息。
'''),
                        TextSpan(text: '\nHow Good（有什么好处？）\n', style: hstyle),
                        const TextSpan(text: '''
        变得聪明：能分辨真假，做出聪明的选择。
        学习更快：因为你知道哪些信息是值得学的。
        更好的解决问题：能找到问题的关键，更快解决它。
'''),
                        const TextSpan(text: ''),
                      ])),
                  SelectableText.rich(TextSpan(children: [
                    TextSpan(children: [
                      TextSpan(text: '\nWhy：', style: hstyle),
                      const TextSpan(
                          text:
                              '首先，我们想想为什么我们需要逆向思维。就像玩拼图时，有时候我们需要从后往前拼，逆向思维帮助我们从不同的角度看待问题，找到新的解决方法。')
                    ]),
                    TextSpan(children: [
                      TextSpan(text: '\n\nWhat：', style: hstyle),
                      const TextSpan(
                          text:
                              '逆向思维就是当我们思考问题时，不是按照常规的方式，而是反过来想。比如，大家都在想“我们怎么到达这里”，而逆向思维会让我们想“我们怎么从这里离开”。')
                    ]),
                    TextSpan(children: [
                      TextSpan(text: '\n\nHow:', style: hstyle),
                      const TextSpan(
                          text:
                              '那么，我们怎么做逆向思维呢？想象一下，你在玩一个游戏，需要把一个球从起点滚到终点。常规思维是找到一条路径让球滚过去。但如果我们用逆向思维，我们会先看看终点附近，然后反向找到起点。就像我们先看到球在终点，然后想象它是怎么滚过来的。')
                    ]),
                    TextSpan(children: [
                      TextSpan(text: '\n\nHow good：', style: hstyle),
                      const TextSpan(
                          text:
                              '逆向思维的好处是它可以帮助我们发现问题的新解决方案，有时候这些方案是其他人没想到的。这就像是找到了一个隐藏的宝藏一样，非常酷！')
                    ]),
                  ])),
                  SelectableText.rich(TextSpan(children: [
                    TextSpan(children: [
                      TextSpan(text: '\nWhy：', style: hstyle),
                      const TextSpan(
                          text:
                              '首先，为什么我们要学习结构化思维呢？想象你在玩积木，如果你随意堆叠，积木很快就会倒。但如果我们用一种有序的方式堆叠，就可以建造一个很稳固的塔。结构化思维就像这样，它帮助我们有序地组织我们的想法和解决问题。')
                    ]),
                    TextSpan(children: [
                      TextSpan(text: '\n\nWhat：', style: hstyle),
                      const TextSpan(
                          text:
                              '结构化思维就是把复杂的问题分解成小块，然后一步步解决这些小块。就像把一个大蛋糕切成许多小块，这样吃起来就容易多了。')
                    ]),
                    TextSpan(children: [
                      TextSpan(text: '\n\nHow:', style: hstyle),
                      const TextSpan(
                          text:
                              '那么，我们怎么做结构化思维呢？我们可以这样：\n\n\t\t\t\t- 定义问题：就像你告诉妈妈你想要的玩具是什么一样，我们需要明确我们要解决的问题是什么。\n\t\t\t\t- 分解问题：把问题分成几个小部分，就像把蛋糕切成块一样。\n\t\t\t\t- 解决小问题：一个接一个地解决这些小问题，就像你一块接一块地吃蛋糕。\n\t\t\t\t- 整合答案：把解决的小问题的答案组合起来，得到大问题的答案。')
                    ]),
                    TextSpan(children: [
                      TextSpan(text: '\n\nHow good：', style: hstyle),
                      const TextSpan(
                          text:
                              '结构化思维的好处是它可以帮助我们更清晰地思考问题，不会感到困惑。它还可以帮助我们找到更好的解决方案，因为每个小问题都考虑得很周到。'),
                      const TextSpan(
                          text:
                              '\n\n比如，如果你要组织一次生日派对，你可以这样用结构化思维：\n\n\t\t\t\t- 定义问题：我要举办一个生日派对。\n\t\t\t\t- 分解问题：我需要决定邀请哪些朋友、准备什么食物、做什么游戏。\n\t\t\t\t- 解决小问题：列出朋友的名字，选择大家喜欢吃的食物，想出一些有趣的游戏。\n\t\t\t\t- 整合答案：把这些信息放在一起，你就有派对的完整计划了。')
                    ]),
                  ])),
                ],
              ),
            )),
      ),
    );
  }
}
