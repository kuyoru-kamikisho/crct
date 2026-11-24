# promilia-server

Spring Boot 后端（用户认证 / 资料 / 邮件）。默认端口 `8080`。

## 环境要求

| 组件 | 版本建议 | 本机参考路径（见 `devDescription.md`） |
|------|----------|----------------------------------------|
| JDK | 8 | `E:\jdk8` |
| Maven | 3.6+ | `E:\maven-3.6.1\apache-maven-3.6.1` |
| MySQL | 8.0 | `E:\mysql-8.0.46` |
| Redis | 任意稳定版 | `E:\Redis-8.10.3-cygwin-with-Service` |

配置见 `src/main/resources/application.yml`：

- MySQL：`127.0.0.1:3306`，库名 `promilia`，用户 `root`
- Redis：`127.0.0.1:6379`
- 邮件：本地默认 `promilia.mail.mock: true`（不连 SMTP）；真发信时改为 `false` 并配置 `spring.mail` / `promilia.mail`
- 密码传输：登录/注册/重置密码须先 `GET /api/auth/password-public-key`，再用 RSA-OAEP(SHA-256) 加密后提交（前端 `shared.js` 已封装）

---

## 命令行启动（分步）

在 **PowerShell** 或 **cmd** 中操作。以下路径请按本机实际修改。

### 1. 准备环境变量（当前窗口）

```bat
set JAVA_HOME=E:\jdk8
set MAVEN_HOME=E:\maven-3.6.1\apache-maven-3.6.1
set MYSQL_HOME=E:\mysql-8.0.46
set REDIS_HOME=E:\Redis-8.10.3-cygwin-with-Service
set PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%MYSQL_HOME%\bin;%PATH%
```

### 2. 启动 Redis

```bat
cd /d %REDIS_HOME%
redis-server.exe redis.conf
```

另开窗口保持运行；或直接双击该目录下的 `start.bat`（Redis 自带）。

验证：

```bat
redis-cli.exe ping
```

期望返回 `PONG`。

### 3. 启动 MySQL

若尚未安装为 Windows 服务，可用：

```bat
"%MYSQL_HOME%\bin\mysqld.exe" --defaults-file="%MYSQL_HOME%\my.ini"
```

另开窗口保持运行。创建业务库（表会在应用启动时自动执行 `schema.sql`）：

```bat
mysql -uroot -p"?.spU?pfO9uf" -e "CREATE DATABASE IF NOT EXISTS promilia DEFAULT CHARACTER SET utf8mb4;"
```

验证：

```bat
mysqladmin -uroot -p"?.spU?pfO9uf" ping
```

### 4. 启动 Server

进入本目录后任选一种方式：

**开发运行（推荐）：**

```bat
cd /d D:\code\crct\promilia\server
mvn -DskipTests spring-boot:run
```

**先打包再运行：**

```bat
cd /d D:\code\crct\promilia\server
mvn -DskipTests package
java -jar target\promilia-server-1.0.0-SNAPSHOT.jar
```

启动成功后访问示例：`http://localhost:8080/api/captcha`

### 5. 运行测试（可选）

```bat
cd /d D:\code\crct\promilia\server
mvn test
```

测试会连本机 MySQL / Redis（见 `src/test/resources/application-test.yml`），请先保证二者已启动。

---

## 一键启动脚本

同目录提供 PowerShell 脚本 **`start.ps1`**，会按顺序：

1. 检测并启动 Redis（未监听 `6379` 时）
2. 检测并启动 MySQL（未监听 `3306` 时），并等待就绪
3. 创建数据库 `promilia`（若不存在）
4. 在本窗口执行 `mvn -DskipTests spring-boot:run`

**用法：** 在 PowerShell 中执行：

```powershell
cd D:\code\crct\promilia\server
.\start.ps1
```

若提示无法运行脚本，可先执行：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\start.ps1
```

脚本顶部可改 `$JavaHome` / `$MavenHome` / `$MysqlHome` / `$RedisHome` / 数据库账号密码。Redis、MySQL 会开最小化窗口；关闭当前 PowerShell 窗口会结束 Java 进程，一般不会自动关掉 Redis/MySQL。

---

## 常见问题

- **连不上库 / Redis**：先确认 `3306`、`6379` 在监听（`netstat -ano | findstr ":3306 :6379"`）。
- **密码不一致**：同时改 `application.yml` 与 `start.ps1` 中的 MySQL 密码。
- **邮件相关接口失败**：`application.yml` 里 `promilia.mail.mock: true` 时不连真实 SMTP，验证码会出现在接口响应 `data.emailCode` 和服务端日志 `[MAIL-MOCK]`；要真发邮件时改为 `false` 并配置 `spring.mail` / `promilia.mail`。
- **端口占用**：改 `application.yml` 里 `server.port`，或结束占用 `8080` 的进程。
