// 番茄音乐PC端控制台脚本：一键下载分享过来的音乐
let playBtn = document.querySelector('.music-share-pc-control-play');
playBtn.click();
setTimeout(() => playBtn.click(), 1000);

let audioDom = document.querySelector('audio');
let audioNameDom = document.querySelector('.music-share-pc-meta-title');

if (audioDom) {
    // 音乐在服务器端的链接
    let audioSrc = audioDom.getAttribute('src');
    // 音乐的名称
    let audioName = audioNameDom ? audioNameDom.innerText.trim() : '';

    if (audioSrc && audioName) {
        // 处理文件名，去掉非法字符，补上扩展名
        let safeName = audioName.replace(/[\\/:*?"<>|]/g, '_');
        // 根据 mime_type 判断扩展名，audio_mp4 一般是 m4a
        let ext = audioSrc.includes('mime_type=audio_mp4') ? '.m4a' : '.mp3';

        // ---- 下载部分 ----
        fetch(audioSrc)
            .then(res => {
                if (!res.ok) throw new Error('请求失败: ' + res.status);
                return res.blob();
            })
            .then(blob => {
                let url = URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = safeName + ext;   // 下载文件名 = 音乐名 + 扩展名
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                // 释放内存
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                console.log('已触发下载：' + safeName + ext);
            })
            .catch(err => {
                console.error('下载失败，尝试直接打开链接：', err);
                // 兜底方案：直接用 a 标签指向源地址
                let a = document.createElement('a');
                a.href = audioSrc;
                a.download = safeName + ext;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
        // ---- 下载部分结束 ----
    }
}