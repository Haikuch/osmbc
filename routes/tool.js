"use strict";

var debug = require('debug')('OSMBC:routes:tool');
var fs = require('fs');
var express = require('express');
var router = express.Router();
var publicRouter = express.Router();
var config = require('../config.js');
var url = require('url');
var http = require('http');
var https = require('https');
var moment= require('moment');
var emailValidator = require('email-validator');
var BlogRenderer = require('../render/BlogRenderer.js');
var ical = require('ical-generator');
var farmhash = require('farmhash');

var markdown = require("markdown-it")()
  .use(require("markdown-it-sup"))
  .use(require("markdown-it-imsize"), { autofill: true });

var parseEvent = require('../model/parseEvent.js');

var articleModule = require('../model/article.js');
var configModule = require('../model/config.js');


var sizeOf = require('image-size');



function renderPublicCalendar(req,res,next) {
  debug('renderPublicCalendar');
  var htmlRoot = config.getValue("htmlroot");
  var bootstrap = config.getValue("bootstrap");

  var layout = {bootstrap:bootstrap,htmlRoot:htmlRoot};

  parseEvent.calenderToMarkdown({lang:"EN",countryFlags:true,duration:'200'},function(err,result,errors){
    if (err) return next(err);
    var preview = markdown.render(result);
    preview = preview.replace('<table>','<table class="table">');
    res.render('calenderPublic.jade',{calenderAsMarkdown:result,
      errors:errors,preview:preview,layout:layout});

  });
}

function renderJSONCalendar(req,res,next) {
  debug('renderPublicCalendar');
  var email = req.query.email;
  if (!emailValidator.validate(email)) {
    return next(new Error("Please add your email to query. Thanks TheFive. "+email+" looks invalid."));
  }
  fs.appendFileSync("Calendarusage.log",email+" "+new Date()+"\n");

  parseEvent.calenderToJSON({},function(err,result){
    if (err) return next(err);

    res.json(result);
  });
}


var cache = {};
config.initialise();
let calendarList = config.getValue("calendarList");
let domain = config.getValue("url");
for (let i=0;i<calendarList.length;i++) {
  let country = calendarList[i];
  let url = domain+config.getValue("htmlroot")+"/calendar/"+country+".ics";
  cache[country.toLowerCase()] = new ical({domain:domain,url:url,name:"OpenStreetMap["+country+"]"});
}
let calendarurl = domain+config.getValue("htmlroot")+"/calendar/all.ics";
cache.all =  new ical({domain:domain,url:calendarurl,name:"OpenStreetMap"});

function readICSFromWiki() {
  debug('readICSFromWiki');
  parseEvent.calenderToJSON({},function(err,result){
    if (err) {
      console.log("Error while reading calendar entries from wiki:");
      console.dir(err);
      return;
    }
    console.log("Reading calendar entries from wiki Current Number: "+result.events.length);
    for (let i=0;i<result.events.length;i++) {
      let e = result.events[i];

      cache.all.createEvent({
        uid : farmhash.fingerprint64(e.text+ e.startDate),
        start: e.startDate,
        end: e.endDate,
        summary: e.text,
        location: e.town,
        allDay:true
      });
      if (cache[e.country.toLowerCase()]) {
        cache[e.country.toLowerCase()].createEvent({
          uid : farmhash.fingerprint64(e.text+ e.startDate),
          start: e.startDate,
          end: e.endDate,
          summary: e.text,
          location: e.town,
          allDay:true
        });
      }
    }
  });
  setTimeout(readICSFromWiki,1000*60*10);
}
readICSFromWiki();

function renderICSCalendar(req,res,next) {
  debug('renderICSCalendar');
  fs.appendFileSync("ICSCalendarusage.log",country+" "+new Date()+"\n");
  var country = req.params.country;
  if (!cache[country]) return next(new Error("Country not defined"));
  cache[country].serve(res);
}

function renderCalenderAsMarkdown(req,res,next) {
  debug('renderCalenderAsMarkdown');

  var disablePrettify = false;
  var enableCountryFlags = false;
  var date="";
  var duration="";
  var sessionData = req.session.calenderTool;

  if (sessionData) {
    disablePrettify = sessionData.disablePrettify;
    enableCountryFlags = sessionData.enableCountryFlags;
    date = sessionData.date;
    duration = sessionData.duration;
  }

  if (!moment(date).isValid()) date = "";

  parseEvent.calenderToMarkdown({lang:req.user.getMainLang(),countryFlags:enableCountryFlags,duration:duration,date:date},function(err,result,errors){
    if (err) return next(err);
    res.render('calenderAsMarkdown',{calenderAsMarkdown:result,
                                disablePrettify:disablePrettify,
                                enableCountryFlags:enableCountryFlags,
                                date:date,
                                duration:duration,
                                errors:errors,
                                layout:res.rendervar.layout});  

  });
}
function postCalenderAsMarkdown(req,res,next) {
  debug('postCalenderAsMarkdown');
  var disablePrettify = (req.body.disablePrettify=="true");
  var enableCountryFlags = req.body.enableCountryFlags;
  var duration = req.body.duration;
  var lang = moment.locale();
  moment.locale(req.user.getMainLang());

  var date = moment(req.body.date,"L").toISOString();
  moment.locale(lang);

  req.session.calenderTool = {disablePrettify:disablePrettify,
                              date:date,
                              duration:duration,
                              enableCountryFlags:enableCountryFlags};
  req.session.save(function(err){
    if (err) return next(err);
    res.redirect(config.getValue('htmlroot')+"/tool/calender2markdown");
  });
}

function generateCCLicense(license,lang,author){
  debug("generateCCLicense");
  var licenses = configModule.getConfig("licenses");
  if (!license || license === "") license = "CC0";
  if (!lang || lang === "") lang = "EN";
  if (!author) author = "";
  if (typeof(licenses[license])=="undefined") license = "CC0";
  var text = licenses[license][lang];
  if (typeof(text)=="undefined") text = licenses[license].EN;
  if (typeof(text)=="undefined") text = "";

  return text.replace("##author##",author);
} 

function renderPictureTool(req,res) { 
  debug('renderPictureTool');

  var pictureLanguage = "DE";
  var pictureURL = "http://blog.openstreetmap.de/wp-content/themes/osmblog/images/headers/blog.png";
  var pictureMarkup = "Some cool markdown text with [^1^](#blog_article) superscript";
  var pictureAText = "Logo";
  var pictureLicense = "CC3";
  var pictureAuthor = "[Author Name](LINK)";
  var sessionData = req.session.pictureTool;
  
  if (sessionData) {
    if (sessionData.pictureLanguage) pictureLanguage = sessionData.pictureLanguage;
    pictureURL = sessionData.pictureURL;
    if (!pictureURL) pictureURL ="";
    pictureMarkup = sessionData.pictureMarkup;
    pictureAText = sessionData.pictureAText;
    pictureLicense = sessionData.pictureLicense;
    pictureAuthor = sessionData.pictureAuthor;
  }

  var warning =[];


  var options = url.parse(pictureURL);
  
  var p = http;
  if (pictureURL.substring(0,5)=="https") p = https;

  var chunks = [];
  var request = p.get(options,function (req){
    req.on('data', function (chunk) {
      chunks.push(chunk);
    });
    req.on('end', function() {
      var buffer = Buffer.concat(chunks);
      var sizeX = 100;
      var sizeY = 100;
      try {
        sizeX = sizeOf(buffer).width;
        sizeY = sizeOf(buffer).height;
      } catch (err) {
        warning.push(err);
      }
      if (sizeX < 700) warning.push("Picture width lower than 700 pixel, check resulting quality.");
      if (sizeY > 900) warning.push("Picture width bigger than 900 pixel, please reduce size.");
      if (pictureURL.indexOf("blog.openstreetmap.de")<0) warning.push("Picture not hosted on blog.openstreetmap.de");
      var genMarkup="";

      sizeY = Math.round(sizeY * 800 / sizeX);
      sizeX = 800; 
      genMarkup = "!["+pictureAText+"]("+pictureURL+ " ="+sizeX+"x"+sizeY+")\n";
      if (pictureLanguage=="DE") {
         genMarkup += "\n";
      }
      genMarkup += pictureMarkup;
      var ltext = generateCCLicense(pictureLicense,pictureLanguage,pictureAuthor);
      if (ltext !== "") genMarkup += " | "+ltext;

      var article = articleModule.create();
      article["markdown"+pictureLanguage]=genMarkup;
      article.categoryEN = "Picture";
      let renderer = new BlogRenderer.HtmlRenderer(null);
      var preview = renderer.renderArticle(pictureLanguage,article);
      var licenses = configModule.getConfig("licenses");

      res.render('pictureTool',{warning:warning,
                                genMarkup:genMarkup,
                                licenses:licenses,
                                preview:preview,
                                pictureLanguage:pictureLanguage,
                                pictureURL:pictureURL,
                                pictureMarkup:pictureMarkup,
                                pictureAText:pictureAText,
                                pictureAuthor:pictureAuthor,
                                pictureLicense:pictureLicense,
                                layout:res.rendervar.layout});  
    });
  });
  


  request.on('error',function() {
    warning.push(">"+pictureURL+"< pictureURL not found");
    var licenses = configModule.getConfig("licenses");

    res.render('pictureTool',{genMarkup:"picture not found",
                              warning:warning,
                              preview:"<p> Error,please try again</p>",
                              pictureLanguage:pictureLanguage,
                              pictureURL:pictureURL,
                              pictureMarkup:pictureMarkup,
                              licenses:licenses,
                              pictureAText:pictureAText,
                              pictureLicense:pictureLicense,
                              pictureAuthor:pictureAuthor,
                              layout:res.rendervar.layout});  

  });
  request.end();

}
function postPictureTool(req,res,next) {
  debug('postPictureTool');

  var pictureLanguage = req.body.pictureLanguage;
  var pictureURL = req.body.pictureURL;
  var pictureMarkup = req.body.pictureMarkup;
  var pictureAText = req.body.pictureAText;
  var pictureLicense = req.body.pictureLicense;
  var pictureAuthor = req.body.pictureAuthor;

  req.session.pictureTool = {pictureLanguage:pictureLanguage,
                              pictureURL:pictureURL,
                              pictureMarkup:pictureMarkup,
                              pictureLicense:pictureLicense,
                              pictureAuthor:pictureAuthor,
                              
                              pictureAText:pictureAText};
  req.session.save(function(err){
    if (err) return next(err);
    res.redirect(config.getValue('htmlroot')+"/tool/picturetool");
  });
}


router.get('/calender2markdown', renderCalenderAsMarkdown);
router.post('/calender2markdown', postCalenderAsMarkdown);
router.get('/picturetool', renderPictureTool);
router.post('/picturetool', postPictureTool);

publicRouter.get("/calendar/preview",renderPublicCalendar);
publicRouter.get("/calendar/json",renderJSONCalendar);
publicRouter.get("/calendar/:country.ics",renderICSCalendar);
module.exports.router = router;
module.exports.publicRouter = publicRouter;
