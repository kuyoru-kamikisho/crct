let playBtn = document.querySelector('.music-share-pc-control-play');
playBtn.click();
setTimeout(() => playBtn.click(), 1000);
let audioDom = document.querySelector('audio');
let audioNameDom = document.querySelector('.music-share-pc-meta-title');
if (audioDom) {
    // 音乐在服务器端的链接
    let audioSrc = audioDom.getAttribute('src');
    // 音乐的名称
    let audioName = audioNameDom.innerText;
    if (audioSrc && audioName) {
        // 在控制台执行时会直接触发下载，下载的文件名要重命名为音乐名
        console.log('可下载');
    }
}