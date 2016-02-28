"use strict";

var express = require('express');
var should = require('should');
var router = express.Router();
var debug = require('debug')('OSMBC:routes:changes');
var logModule = require('../model/logModule.js');
var jsdiff = require('diff');


function generateHTMLDiff(one,other) {
  debug("generateHTMLDiff");
  if (!one) one = "";
  if (! other) other = "";

  if (typeof(one)!= "string") return "";
  if (typeof(other)!= "string") return "";
  
  var diff = jsdiff.diffChars(one, other);

  var result = "";
  diff.forEach(function(part){
    // green for additions, red for deletions
    // grey for common parts
    var styleColor               = 'style="color:grey"';
    if (part.added) styleColor   = 'class="osmbc-inserted-inverted"';
    if (part.removed) styleColor = 'class="osmbc-deleted-inverted"';
  

    result += '<span '+styleColor+'>'+part.value+'</span>';
  });  
  return result;
}


function renderOutgoingMailLog(req,res,next) {
  debug('renderOutgoingMailLog');
  var d = req.params.date;
  logModule.find("select id, data from changes where data->>'table' = 'mail' and substring(data->>'timestamp' from 1 for "+ d.length+") ='"+d+"' order by data->>'timestamp' desc",function (err,result){
    debug("logModule.find");
    if (err) return next(err);
    res.render("maillog",{maillog:result,layout:res.rendervar.layout});
  });
}


function renderHistoryLog(req,res,next) {
  debug('renderHistoryLog');
  var date = req.params.date;
  var user = req.query.user;
  var table = req.query.table;
  var blog = req.query.blog;
  var property = req.query.property;

  var params={date:date,user:user,table:table,blog:blog,property:property}


  var sql = "";
  if (date) {
    if (sql != "") sql += " and ";
    sql += " (substring(data->>'timestamp' from 1 for "+ date.length+") ='"+date+"') ";
  }
  if (user) {
    if (sql != "") sql += " and ";
    sql += " (data->>'user' = '"+ user+"') ";
  }
  if (table) {
    if (sql != "") sql += " and ";
    sql += " (data->>'table' = '"+ table+"') ";
  }
  if (blog) {
    if (sql != "") sql += " and ";
    sql += " (data->>'blog' = '"+ blog+"') ";
  }
  if (property) {
    if (sql != "") sql += " and ";
    sql += " (data->>'property' = '"+ property+"') ";
  }
  if (sql) sql = " where "+sql;
  sql = "select id,data from changes "+sql+" order by data->>'timestamp' desc limit 500;";
  console.log(sql);
  logModule.find(sql,function (err,result){
    debug("logModule.find");
    if (err) return next(err);
    res.render("history",{history:result,layout:res.rendervar.layout,params:params});
  });
}

/* GET users listing. */
function renderChangeId(req, res, next) {
  debug('renderChangeId');
  var id = req.params.change_id;
  logModule.findById(id,function(err,change) {
    if (!change || typeof(change.id) == 'undefined') return next();
    should.exist(res.rendervar);
    res.render('change',{change:change,
                         coloredChange:generateHTMLDiff(change.from,change.to),
                         layout:res.rendervar.layout});
  });
}
  

router.get('/:change_id',renderChangeId);

router.get('/mail/:date',renderOutgoingMailLog);

router.get('/log/:date',renderHistoryLog);
router.get('/log',renderHistoryLog);

module.exports.renderChangeId = renderChangeId;
module.exports.router = router;


