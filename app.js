var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
var async = require('async');
var url = require('url');

var cnodeUrl = 'https://cnodejs.org/';

superagent.get(cnodeUrl)//发送GET请求


  .end(function (err, res) {//得到请求后的结果
    if (err) {
      return console.error(err);
    }
    var topicUrls = [];
    var $ = cheerio.load(res.text);//将html内容传递给cheerio.load()之后，就得到了一个实现了jQuery接口的变量，通常命名为$,其余用法与jQuery类似
    
    $('#topic_list .topic_title').each(function (idx, element) {
      var $element = $(element);
      var href = url.resolve(cnodeUrl, $element.attr('href'));
      topicUrls.push(href);//把所有文章的链接都存入数组topicUrls中
    });

    var ep = new eventproxy();//实例化eventproxy模块

    ep.after('topic_html', topicUrls.length, function (topics) {
      // // 在所有文件的异步执行结束后将被执行
      // 所有文件的内容都存在topics数组中，按顺序排列
      topics = topics.map(function (topicPair) {//为topics数组中的每一个执行
        var topicUrl = topicPair[0];
        var topicHtml = topicPair[1];
        var $ = cheerio.load(topicHtml); 
        return ({
          title: $('.topic_full_title').text().trim(),
          href: topicUrl,
          comment1: $('.reply_content').eq(0).text().trim(),
        });
      });
      
      console.log('final:');
      console.log(topics);
    });

    // topicUrls.forEach(function (topicUrl) {
    //   superagent.get(topicUrl)
    //     .end(function (err, res) {
    //       console.log('fetch ' + topicUrl + ' successful');
    //       ep.emit('topic_html', [topicUrl, res.text]);
    //     });
    // });
  
  async.mapLimit(topicUrls,5,function(topicUrl,callback){
    superagent.get(topicUrl)
      .end(function(err,res){
        console.log("fetch:"+topicUrl+".successful");
        ep.emit('topic_html',[topicUrl,res.text]);
        callback();
      });
    },function(err){
      console.log(err);
   });
});


