// 文件名 key_mnitor.dart
//  
// 有这样的一个exe文件：path.join(Directory.current.path, 'plugins', 'keys', 'keyMonitor.exe')，这是一个控制台程序
// 控制台程序启动命令的参数参考： keyMonitor.exe -m ws -p 7077  启动该程序不应该弹出cmd窗口
// 这个启动命令会让 exe 程序创建一个ws服务，地址为当前电脑ip的7077端口，比如  ws://192.168.110.50：7077
// 
// 需求(一些描述类似js)：
// 1. 写一个flutter dart文件 class类
// 2. 类里面有函数 run(<port>)  这个函数会执行 keyMonitor.exe -m ws -p <port> ，
// 3. run(<port>)函数 执行成功后尝试获取本机ip地址，获取到ip地址后 拼接ip和端口为字符串储存到类里面的变量 wsAddress 里面 
// 4. run(<port>)函数 如果执行失败，将失败信息储存到类变量 errMessage 里面
// 5. 因为exe文件一直保持运行，所有run(<port>)函数不应该阻塞flutter ui的渲染，可以考虑异步或子线程执行
// 6. 额外加一个函数 用于杀死exe程序的运行（即类似桌面直接叉掉cmd窗口让exe结束掉）
// 7. 类里面加一个变量 用于记录exe程序是否正在执行，在run时和销毁exe时都要改变这个状态
// 8. connectWs()函数 尝试连接 wsAddress 变量记录的地址，并将websocket连接实例记录在变量 websocket 里面
// 9. connectWs()函数 连接成功后(比如js：websocket.onopen=()=>{websocket.send('hello')})立马发送一个消息 'hello'
// 10. websocket.onopen之后 立刻设置类属性变量 wsStatus 为枚举值中的 connected，枚举值包含 connected、failed、connecting、unconnect，请在合适的时机设置这些枚举值
// 11. websocket.onmessage 将所有消息e.data记录在 wsMessage 变量里面，该换行就换行
// 12. websocket.onerror 将错误消息记录在 wsErrorMessage 变量里面
// 13. websocket.onclose 改变 wsStatus变量
// 14. 上面提到的变量都应该是响应式的变量，以便在flutter程序中实时变化告诉用户现在的状态，相关变量请使用ChangeNotifier或者ValueChangeNotifier等方式来通知程序变更渲染
// 15. 如果有其它可以让这个工具类更好用常用的功能也可以写进去，我初学flutter上面就是大概的需求
// ----------------

// 帮我实现上述所有需求 