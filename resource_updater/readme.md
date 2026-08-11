## 功能对照

默认比对 HEAD~1 → HEAD
-hash <旧>：旧提交 → 最新；-hash <旧> <新>：切换到新提交并比对
列出新增 / 修改 / 删除（含重命名）
询问是否生成更新器（默认 Y）
选择 bash → updater.sh 或 cmd → updater.cmd
变更文件复制到项目下 update/，保留相对路径；删除列表写入脚本
更新器：输入目标根目录、拦截危险路径、删除旧文件、静默覆盖复制

## 使用方式

在被分析的 Git 项目目录下执行：

D:\code\crct\resource_updater\run.bat
或：

python D:\code\crct\resource_updater\analyzer.py
python D:\code\crct\resource_updater\analyzer.py -hash abc1234
python D:\code\crct\resource_updater\analyzer.py -hash abc1234 def5678
python D:\code\crct\resource_updater\analyzer.py D:\path\to\project
生成后进入 update/，运行 updater.cmd（Windows）或 bash updater.sh（Linux），按提示输入被更新资源的绝对路径即可。