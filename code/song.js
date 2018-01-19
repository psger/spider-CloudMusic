const async = require('async');//异步流程控制
const agent = require('superagent');//superagent它是一个强大并且可读性很好的轻量级ajaxAPI
const cheerio = require('cheerio');
const moment = require('moment');
const request = require('request');
const notifier = require('node-notifier');

const query = require('../mysql');
const {
    singerConfig,
    songConfig
} = require('../config');
const {
    limitLength,
    splitId,
    notify
} = require('../util');


function jsonDateFormat(jsonDate) {//json日期格式转换为正常格式
 try {
  var date = new Date(parseInt(jsonDate.replace("/Date(", "").replace(")/", ""), 10));
  var month = date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
  var day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  var milliseconds = date.getMilliseconds();
  return date.getFullYear() + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds + "." + milliseconds;
 } catch (ex) {
  return "";
 }
}

const songCollect = () => {
    query('select min(singer) from song', [], (err, res, rs) => {
        let index = 31253//res[0]['min(singer)'] || 0;
        async.whilst(() => {//whilst：while循环执行任务，但本次任务执行完毕后才会进入下一次循环，每次只循环一个歌手
            return index >= 31252;
        }, (cb) => {
            // 从数据库中获取歌手姓名以及URL 然后开始遍历歌曲
            query('select name,url from singer where singer=?', [index], (err, res) => {
                if (!err) {
                    const singer = {
                        name: res[0].name,
                        url: res[0].url.trim()
                    }
                    agent(songConfig.common + singer.url)
                        .then(res => {
                            const $ = cheerio.load(res.text);
                            const content = $('#song-list-pre-cache textarea');                                               
                            const song = JSON.parse(content.text());
                            limitLength(song, songConfig.len);//取到每一个歌手多少首歌了  song是一个数组

                            async.mapLimit(song, 10, (item, cbItem) => { // 并发数量N
                                // 遍历前N首歌曲 并且获取评论数量
                                const href = '/song?id=' + item.id;
                                const id = item.commentThreadId;
                                const title = item.name;
                                const url = songConfig.comment + id + '?csrf_token=';
                                songConfig.req.url = url;
                                request(songConfig.req, (err, res, body) => {
                                    if (body) {
                                        const content = JSON.parse(body);
                                        const commet = content.total;
                                        json = eval(content.hotComments)
                                        for (var i=0;i<json.length;i++){
                                                // console.log(json[i].user.nickname+"_____"+json[i].content);
                                                // console.log("<br/>");
                                                // username = json[i].user.nickname;
                                                // userid = json[i].user.userId;
                                                // content = json[i].content;
                                                // like = json[i].likedCount;
                                                // time = json[i].time;
                                                var time = new Date(json[i].time);//格式化json日期
                                                tim =  time.toLocaleString();
                                                query('insert into comment(song_id,content,comm_like,user_name,user_id,comm_time) values(?,?,?,?,?,?)',[href,json[i].content,json[i].likedCount,json[i].user.nickname,json[i].user.userId,tim],(err,response) =>{
                                                    if(err){
                                                        console.log("出错了");
                                                        console.log(err);
                                                        console.log("~~~~~~~~~~~~~~~~~~~~~~~~");//query('update comment set song_id=?,content=?,comm_like=?,user_name=?,user_id=? where song_id=?',[json[i].content,json[i].likedCount,json[i].user.nickname,json[i].user.userId,href], () => {});
                                                    }
                                                })  
                                            }
                                        
                                        query('insert into song(title,comment,url,name,singer) values(?,?,?,?,?)', [title, commet, href, singer.name, index], (err, response) => {
                                            if (err) {
                                                // 说明歌曲重复 进行update操作
                                                query('update song set title=?,comment=?,name=?,singer=? where url=?', [title, commet, singer.name, index, href], () => {});
                                            }
                                            // 插入数据完毕
                                            cbItem();
                                        })
                                    } else {
                                        console.log('未知错误');
                                        notify('错误', '未知错误');
                                        cbItem();
                                    }
                                })
                            }, () => {
                                console.log('歌手 ' + singer.name + ' 抓取完毕');
                                index++;
                                cb();
                            })
                        })

                        //错误处理部分
                        .catch(err => {
                            // 错误处理
                            const errStr = err.toString();
                            if (errStr.includes('innerHTML')) {
                                // 页面404 直接跳到下一个歌手
                                console.log(err, singer.name + ' 页面丢失 请求的URL为' + songConfig.common + singer.url);
                                //notify('请求超时', singer.name + ' 页面丢失 请求的URL为' + songConfig.common + singer.url);
                                index++;
                            } else {
                                // goto超时处理 或者服务器503
                                console.log(err, singer.name + ' 请求超时 即将请求下一位歌手 请求的URL为' + songConfig.common + singer.url);
                                //notify('请求超时', singer.name + ' 请求超时 即将请求下一位歌手 请求的URL为' + songConfig.common + singer.url);
                            }
                            index++;//当歌手没有歌曲的时候返回空的的json数据，此时跳过这位歌手抓取下一位。
                            cb();
                        })
                } else {
                    // 查询错误处理
                    console.log(err, 'singer ID ' + index);
                    notify('数据库查询错误', 'singer ID ' + index);
                    index++;
                    cb();
                }
            })
        })
    })

}
module.exports = songCollect;//为了将函数直接导出成模块，而不是模块的一个方法
