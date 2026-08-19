// biwiki 浏览器端爬取脚本
let kibodata = []
let kibodoms = document.querySelectorAll('.divsort.ap-kibo-child')

kibodoms.forEach(kibodom => {
    // 获取全部data-*自定义属性
    const dataset = kibodom.dataset;

    // 图标元素
    const imgEl = kibodom.querySelector('.kibo-img');
    // 名称
    const nameEl = kibodom.querySelector('.kibo-name');
    // NO编号
    const numEl = kibodom.querySelector('.kibo-number');
    // 详情a标签链接
    const linkEl = kibodom.querySelector('a');

    const item = {
        e1: dataset.e1 ?? "",
        e2: dataset.e2 ?? "",
        param0: dataset.param0 ?? "",
        param1: dataset.param1 ?? "",
        param2: dataset.param2 ?? "",
        param3: dataset.param3 ?? "",
        param4: dataset.param4 ?? "",
        param5: dataset.param5 ?? "",
        param6: dataset.param6 ?? "",
        param7: dataset.param7 ?? "",

        iconSrc: imgEl?.src ?? "",
        iconAlt: imgEl?.alt ?? "",
        name: nameEl?.textContent.trim() ?? "",
        no: numEl?.textContent.trim() ?? "",
        detailHref: linkEl?.href ?? "",

        elements: [] // 保留你原来预留的字段
    }
    kibodata.push(item)
})

console.log("抓取完成，总条数：", kibodata.length)
console.table(kibodata) // 表格形式预览数据

// 一键复制json到剪贴板，方便导出
function copyResult(){
    const jsonStr = JSON.stringify(kibodata, null, 2)
    navigator.clipboard.writeText(jsonStr).then(()=>{
        console.log("✅ JSON已复制到剪贴板！")
    }).catch(err=>{
        console.error("复制失败", err)
    })
}
// 执行 copyResult() 即可复制全部数据