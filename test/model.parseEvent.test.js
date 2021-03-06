"use strict";

var should = require("should");
var parseEvent = require("../model/parseEvent.js");
var nock = require("nock");
var path = require("path");
var fs = require("fs");
var sinon = require("sinon");

var configModule = require("../model/config.js");


/* eslint-disable mocha/no-synchronous-tests */

describe("model/parseEvent", function() {
  var clock;
  before(function(bddone) {
    clock = sinon.useFakeTimers(new Date("2015-12-06").getTime());
    configModule.initialise(bddone);
  });
  after(function(bddone) {
    clock.restore();
    bddone();
  });
  describe("nextDate", function() {
    it("should generate a date in the timeframe [now-50:now+316]", function() {
      var d = new Date();
      var timeMin = d.getTime() - 1000 * 60 * 60 * 24 * 50;
      var timeMax = timeMin + 1000 * 60 * 60 * 24 * 366;
      function isInRange(date) {
        var result = ((date.getTime() >= timeMin) && (date.getTime() <= timeMax));
        return result;
      }

      var date = parseEvent.nextDate(new Date("Jan 27"));
      should(isInRange(date)).be.True();
      should(date.getDate()).equal(27);
      should(date.getMonth()).equal(0);
      date = parseEvent.nextDate(new Date("Feb 01"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Mar 31"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("May 10"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("May 10"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Jun 15"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Jul 20"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Aug 11"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Sep 30"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Oct 2"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Nov 28"));
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Dec 24"));
      should(isInRange(date)).be.True();
    });
    it("should generate a date with previous date [previousDate-150:previousDate+166]", function() {
      var d = new Date("2017-03-23");
      var timeMin = d.getTime() - 1000 * 60 * 60 * 24 * 150;
      var timeMax = timeMin + 1000 * 60 * 60 * 24 * 366;
      function isInRange(date) {
        var result = ((date.getTime() >= timeMin) && (date.getTime() <= timeMax));
        return result;
      }

      var date = parseEvent.nextDate(new Date("Jan 27"), d);
      should(isInRange(date)).be.True();
      should(date.getDate()).equal(27);
      should(date.getMonth()).equal(0);
      date = parseEvent.nextDate(new Date("Feb 01"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Mar 31"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("May 10"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("May 10"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Jun 15"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Jul 20"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Aug 11"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Sep 30"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Oct 2"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Nov 28"), d);
      should(isInRange(date)).be.True();
      date = parseEvent.nextDate(new Date("Dec 24"), d);
      should(isInRange(date)).be.True();
    });
  });
  describe("parseWikiInfo", function() {
    it("should parse a [[]] reference", function() {
      should(parseEvent.parseWikiInfo("  Text [[link]] another Text"))
        .equal("Text [link](https://wiki.openstreetmap.org/wiki/link) another Text");
    });
    it("should parse a [[|]] reference", function() {
      should(parseEvent.parseWikiInfo("[[link|Text for Link]]"))
        .equal("[Text for Link](https://wiki.openstreetmap.org/wiki/link)");
    });
    it("should parse a [ ] reference", function() {
      should(parseEvent.parseWikiInfo("[https://test.test/test Text for Link]"))
        .equal("[Text for Link](https://test.test/test)");
    });
    it("should parse a [] reference", function() {
      should(parseEvent.parseWikiInfo("[https://test.test/test]"))
        .equal("[https://test.test/test](https://test.test/test)");
    });
    it("should parse a complex reference [] first", function() {
      should(parseEvent.parseWikiInfo("The Event [https://test.test/test Text for Link] will be on [[irc]]"))
        .equal("The Event [Text for Link](https://test.test/test) will be on [irc](https://wiki.openstreetmap.org/wiki/irc)");
    });
    it("should parse a complex reference [[]] first", function() {
      should(parseEvent.parseWikiInfo("You find on [[irc]] the Event [https://test.test/test Text for Link]"))
        .equal("You find on [irc](https://wiki.openstreetmap.org/wiki/irc) the Event [Text for Link](https://test.test/test)");
    });
    it("should parse <big> events </big>", function() {
      should(parseEvent.parseWikiInfo("You find on [[irc]] the Event <big>[https://test.test/test Text for Link]</big>"))
        .equal("You find on [irc](https://wiki.openstreetmap.org/wiki/irc) the Event [Text for Link](https://test.test/test)");
    });
  });
  describe("parseLineEvent", function() {
    it("should return null for wrong lines", function() {
      should(parseEvent.parseLine("|-  ")).equal(null);
      should(parseEvent.parseLine("|-")).equal(null);
      should(parseEvent.parseLine("|-        ")).equal(null);
    });
    it("should return values for entry with no town", function() {
      var result = parseEvent.parseLine("| {{cal|social}} || {{dm|Nov 25}} || [[Düsseldorf/Stammtisch|Stammtisch Düsseldorf]], [[Germany]] {{SmallFlag|Germany}}");
      should.exist(result);
      delete result.startDate;
      delete result.endDate;

      delete result.startDate;
      should(result).deepEqual("| {{cal|social}} || {{dm|Nov 25}} || [[Düsseldorf/Stammtisch|Stammtisch Düsseldorf]], [[Germany]] {{SmallFlag|Germany}}"
        /* {type:"social",

                                desc:"[[Düsseldorf/Stammtisch|Stammtisch Düsseldorf]]",
                                countryflag:"Germany",

                                country:"Germany"
                              } */);
    });
    it("should return values for entry with comma separated town", function() {
      var result = parseEvent.parseLine("| {{cal|social}} || {{dm|Nov 25}} || [[Düsseldorf/Stammtisch|Stammtisch Düsseldorf]],  [[Düsseldorf]] , [[Germany]] {{SmallFlag|Germany}}");
      should.exist(result);
      delete result.startDate;
      delete result.endDate;
      should(result).deepEqual({type: "social",

        desc: "[[Düsseldorf/Stammtisch|Stammtisch Düsseldorf]]",
        town: "[[Düsseldorf]]",
        country: "[[Germany]]",
        countryflag: "Germany"
      });
    });
    it("should return values for entry with town (comma)", function() {
      var result = parseEvent.parseLine("| {{cal|social}} || {{dm|Nov 25}} || Stammtisch,  [[Düsseldorf]],  [[Germany]] {{SmallFlag|Germany}}");
      should.exist(result);
      delete result.startDate;
      delete result.endDate;
      should(result).deepEqual({type: "social",

        desc: "Stammtisch",
        town: "[[Düsseldorf]]",
        country: "[[Germany]]",
        countryflag: "Germany"
      });
    });
    it("should return values for entry with town (comma) V2", function() {
      var result = parseEvent.parseLine("| {{cal|social}} || {{dm|Nov 25}} || Stammtisch , [[Düsseldorf]] , [[Germany]] {{SmallFlag|Germany}}");
      should.exist(result);
      should(result.startDate.getDate()).equal(25);
      should(result.startDate.getMonth()).equal(10);
      should(result.endDate.getDate()).equal(25);
      should(result.endDate.getMonth()).equal(10);
      var d = new Date();
      d.setDate(d.getDate() - 50);
      should(result.startDate.getYear()).equal(d.getYear());
      delete result.startDate;
      delete result.endDate;
      should(result).deepEqual({type: "social",
        desc: "Stammtisch",
        town: "[[Düsseldorf]]",
        country: "[[Germany]]",
        countryflag: "Germany"
      });
    });
    it("should return values for entry with town and external description", function() {
      var result = parseEvent.parseLine("| {{cal|social}} || {{dm|Nov 25}} || [https://www.link.de/sublink Tolle Veranstaltung]  ,[[Düsseldorf]] , [[Germany]] {{SmallFlag|Germany}}");
      should.exist(result);
      delete result.startDate;
      delete result.endDate;
      should(result).deepEqual({type: "social",

        desc: "[https://www.link.de/sublink Tolle Veranstaltung]",
        town: "[[Düsseldorf]]",
        country: "[[Germany]]",
        countryflag: "Germany"
      });
    });
    //
    it("should return values for entry with more complex description", function() {
      var result = parseEvent.parseLine("| {{cal|conference}} || {{dm|Aug 24|Aug 26}} || <big>'''[http://2016.foss4g.org/ FOSS4G 2016]'''</big>, [[Bonn]], [[Germany]] {{SmallFlag|Germany}}");
      should.exist(result);
      delete result.startDate;
      delete result.endDate;
      should(result).deepEqual({type: "conference",

        desc: "<big>'''[http://2016.foss4g.org/ FOSS4G 2016]'''</big>",
        town: "[[Bonn]]",
        country: "[[Germany]]",
        countryflag: "Germany"
      });
    });

    it("should return values for entry with no town and country", function() {
      var result = parseEvent.parseLine("| {{cal|info}} || {{dm|Dec 5}} || [[Foundation/AGM15|Foundation Annual General Meeting]] on [[IRC]]");
      should.exist(result);
      delete result.startDate;
      delete result.endDate;
      should(result).deepEqual("| {{cal|info}} || {{dm|Dec 5}} || [[Foundation/AGM15|Foundation Annual General Meeting]] on [[IRC]]" /* {type:"info",
                                desc:"[[Foundation/AGM15|Foundation Annual General Meeting]] on [[IRC]]"
                              } */);
    });
    it("should return values for entry with country and two flags", function() {
      var result = parseEvent.parseLine("| {{cal|social}} || {{dm|Dec 3}} || [[Wien/Stammtisch|53. Wiener Stammtisch]], [[Austria]] {{SmallFlag|Wien|Wien Wappen.svg}} {{SmallFlag|Austria}}");
      should.exist(result);
      delete result.startDate;
      delete result.endDate;
      should(result).deepEqual("| {{cal|social}} || {{dm|Dec 3}} || [[Wien/Stammtisch|53. Wiener Stammtisch]], [[Austria]] {{SmallFlag|Wien|Wien Wappen.svg}} {{SmallFlag|Austria}}"/* {type:"social",
       desc:"[[Wien/Stammtisch|53. Wiener Stammtisch]]",
       country:"Austria",
       countryflag:"Austria",
       wappenflag:"Wien|Wien Wappen.svg",
       } */);
    });
    it("should return values with name and link in wiki different", function() {
      var result = parseEvent.parseLine("| {{cal|pizza}} || {{dm|Apr 22|Apr 24}} || [http://spaceapps.cl International Space Apps Challenge], [[Santiago,_Chile|Santiago]], [[Chile]] {{SmallFlag|Chile}} {{SmallFlag|Santiago,_Chile|Escudo_de_Santiago_(Chile).svg}} ");
      should.exist(result);
      delete result.startDate;
      delete result.endDate;
      should(result).deepEqual({
        "country": "[[Chile]]",
        "countryflag": "Chile}} {{SmallFlag|Santiago,_Chile|Escudo_de_Santiago_(Chile).svg",
        "desc": "[http://spaceapps.cl International Space Apps Challenge]",
        "town": "[[Santiago,_Chile|Santiago]]",
        "type": "pizza"
      });
    });
  });
  describe("calendarToMarkdown", function() {
    it("should load date form wiki and generate a Markdown String", function(bddone) {
      var fileName = path.join(__dirname, "/data/calendarData.wiki");

      nock("https://wiki.openstreetmap.org")
        .get("/w/api.php?action=query&titles=Template:Calendar&prop=revisions&rvprop=content&format=json")

        .replyWithFile(200, fileName);
      parseEvent.calendarToMarkdown({lang: "DE", date: 0, duration: "14"}, function(err, result) {
        should.not.exist(err);
        var expected = fs.readFileSync(path.join(__dirname, "/data/calendar.markup"), "utf8");
        should(result).equal(expected);
        bddone();
      });
    });
    it("should load from wiki and filter out events by date", function(bddone) {
      var wikimarkup = "\n| {{cal|conference}} || {{dm|Dec 12}} || <big>'''[http://2016.foss4g.org/ FOSS4G 2016]'''</big>, [[Bonn]], [[Germany]] {{SmallFlag|Germany}}";
      wikimarkup += "\n| {{cal|conference}} || {{dm|Dec 22}} || <big>'''[Big Event to display]'''</big>, [[Bonn]], [[Germany]] {{SmallFlag|Germany}}\n";
      wikimarkup += "\n| {{cal|conference}} || {{dm|Dec 22}} || [irgendwatt], [[Small Event to be filtered out]], [[Germany]] {{SmallFlag|Germany}}\n";

      var json = {query: {pages: {2567: {}}}};
      json.query.pages[2567].revisions = [];
      json.query.pages[2567].revisions[0] = {"*": wikimarkup};



      nock("https://wiki.openstreetmap.org")
        .get("/w/api.php?action=query&titles=Template:Calendar&prop=revisions&rvprop=content&format=json")

        .reply(200, JSON.stringify(json));
      parseEvent.calendarToMarkdown({lang: "DE", date: new Date("12/06/2015"), duration: "14", big_duration: "21"}, function(err, result) {
        should.not.exist(err);
        var expected = "|Wo  |Was                                   |Wann      |Land   |\n" +
          "|----|--------------------------------------|----------|-------|\n" +
          "|Bonn|[FOSS4G 2016](http://2016.foss4g.org/)|12.12.2015|Germany|\n" +
          "|Bonn|[Event to display](Big)               |22.12.2015|Germany|\n";
        should(result).equal(expected);
        bddone();
      });
    });
    it("should load from wiki and filter out events by country", function(bddone) {
      var wikimarkup = "\n| {{cal|conference}} || {{dm|Dec 12}} || <big>'''[http://2016.foss4g.org/ FOSS4G 2016]'''</big>, [[Bonn]], [[Germany]] {{SmallFlag|Germany}}";
      wikimarkup += "\n| {{cal|conference}} || {{dm|Dec 22}} || <big>'''[Big Event to display]'''</big>, [[New York]], [[USA]] {{SmallFlag|Germany}}\n";
      wikimarkup += "\n| {{cal|conference}} || {{dm|Dec 22}} || [irgendwatt], [[Small Event to be filtered out]], [[USA]] {{SmallFlag|Germany}}\n";

      var json = {query: {pages: {2567: {}}}};
      json.query.pages[2567].revisions = [];
      json.query.pages[2567].revisions[0] = {"*": wikimarkup};



      nock("https://wiki.openstreetmap.org")
        .get("/w/api.php?action=query&titles=Template:Calendar&prop=revisions&rvprop=content&format=json")

        .reply(200, JSON.stringify(json));
      parseEvent.calendarToMarkdown({lang: "EN", date: new Date("12/06/2015"), duration: "14", big_duration: "21", countries: "USA"}, function(err, result) {
        should.not.exist(err);
        var expected = "|Where   |What                                  |When      |Country|\n" +
          "|--------|--------------------------------------|----------|-------|\n" +
          "|Bonn    |[FOSS4G 2016](http://2016.foss4g.org/)|12/12/2015|Germany|\n" +
          "|New York|[Event to display](Big)               |22/12/2015|USA    |\n";
        should(result).equal(expected);
        bddone();
      });
    });
  });
  describe("filterEvent", function() {
    it("should filter a one day event, thats not big", function() {
      let filterTest = parseEvent.filterEvent;
      // clock is set to "2015-12-06" !!
      let option = {date: 0, duration: 14, big_duration: 21};

      should(filterTest({startDate: "2015-12-05"}, option)).be.True();
      should(filterTest({startDate: "2015-12-06"}, option)).be.False();
      should(filterTest({startDate: "2015-12-08"}, option)).be.False();
      should(filterTest({startDate: "2015-12-20"}, option)).be.False();
      should(filterTest({startDate: "2015-12-31"}, option)).be.True();
    });
    it("should filter a one day event, thats big", function() {
      let filterTest = parseEvent.filterEvent;
      // clock is set to "2015-12-06" !!
      let option = {date: 0, duration: 14, big_duration: 21};

      should(filterTest({startDate: "2015-12-05", big: true}, option)).be.True();
      should(filterTest({startDate: "2015-12-06", big: true}, option)).be.False();
      should(filterTest({startDate: "2015-12-08", big: true}, option)).be.False();
      should(filterTest({startDate: "2015-12-27", big: true}, option)).be.False();
      should(filterTest({startDate: "2015-12-31", big: true}, option)).be.True();
    });
    it("should filter a three day event, thats not big", function() {
      let filterTest = parseEvent.filterEvent;
      // clock is set to "2015-12-06" !!
      let option = {date: 0, duration: 14, big_duration: 21};
      should(filterTest({startDate: "2015-12-02", endDate: "2015-12-05"}, option)).be.True();
      should(filterTest({startDate: "2015-12-05", endDate: "2015-12-07"}, option)).be.False();
      should(filterTest({startDate: "2015-12-06", endDate: "2015-12-08"}, option)).be.False();
      should(filterTest({startDate: "2015-12-20", endDate: "2015-12-23"}, option)).be.False();
      should(filterTest({startDate: "2015-12-21", endDate: "2015-12-22"}, option)).be.True();
    });
    it("should filter a three day event, thats big", function() {
      let filterTest = parseEvent.filterEvent;
      // clock is set to "2015-12-06" !!
      let option = {date: 0, duration: 14, big_duration: 21};
      should(filterTest({startDate: "2015-12-02", endDate: "2015-12-05", big: true}, option)).be.True();
      should(filterTest({startDate: "2015-12-05", endDate: "2015-12-07", big: true}, option)).be.False();
      should(filterTest({startDate: "2015-12-06", endDate: "2015-12-08", big: true}, option)).be.False();
      should(filterTest({startDate: "2015-12-20", endDate: "2015-12-23", big: true}, option)).be.False();
      should(filterTest({startDate: "2015-12-27", endDate: "2015-12-29", big: true}, option)).be.False();
      should(filterTest({startDate: "2015-12-28", endDate: "2015-12-31", big: true}, option)).be.True();
    });
    it("should filter with included countries", function() {
      let filterTest = parseEvent.filterEvent;
      // clock is set to "2015-12-06" !!
      let option = {date: 0, duration: 14, big_duration: 21, includeCountries: "germany"};

      should(filterTest({startDate: "2015-12-05", country: "germany", big: true}, option)).be.True();
      should(filterTest({startDate: "2015-12-06", country: "germany", big: true}, option)).be.False();
      should(filterTest({startDate: "2015-12-08", big: true}, option)).be.False(); // no country given, filter does not work
      should(filterTest({startDate: "2015-12-08", country: "germany", big: true}, option)).be.False();
      should(filterTest({startDate: "2015-12-08", country: "UK", big: true}, option)).be.True();
    });
    it("should filter with excluded countries", function() {
      let filterTest = parseEvent.filterEvent;
      // clock is set to "2015-12-06" !!
      let option = {date: 0, duration: 14, big_duration: 21, excludeCountries: "germany"};

      should(filterTest({startDate: "2015-12-05", country: "germany", big: true}, option)).be.True();
      should(filterTest({startDate: "2015-12-06", country: "germany", big: true}, option)).be.True();
      should(filterTest({startDate: "2015-12-08", big: true}, option)).be.False(); // no country given, filter does not work
      should(filterTest({startDate: "2015-12-08", country: "germany", big: true}, option)).be.True();
      should(filterTest({startDate: "2015-12-08", country: "UK", big: true}, option)).be.False();
    });
  });
  describe("calendarToJSON", function() {
    before(function() {
      var fileName = path.join(__dirname, "/data/calendarData.wiki");

      nock("https://wiki.openstreetmap.org")
        .get("/w/api.php?action=query&titles=Template:Calendar&prop=revisions&rvprop=content&format=json")

        .replyWithFile(200, fileName);
    });
    it("should Do an API call and resturn JSON", function(bddone) {
      parseEvent.calendarToJSON({}, function(err, result) {
        should.not.exist(err);
        var converted = JSON.parse(JSON.stringify(result));
        var expected = JSON.parse(fs.readFileSync(path.join(__dirname, "/data/calendar.json"), "utf8"));
        should(converted).eql(expected);
        bddone();
      });
    });
  });
});
