const singerConfig = {
    common: 'https://music.163.com/discover/artist/cat',
    list: [{
        title: '华语男歌手',
        category: '华语',
        id: '1001'
    }],
    queue:[]
}
for(let index=65;index<=90;index++){
    singerConfig.queue.push({
        index,
        letter:String.fromCharCode(index)
    })
}//字符串中的每个字符都由单独的数字 Unicode 编码指定。这段循环就是把65-90所表示的字母存入queue中
singerConfig.queue.push({
    index:0,
    letter:'其他'
})
module.exports = singerConfig;