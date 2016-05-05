// Load VexTab module.
vextab = require("vextab");
$ = require("jquery");
_ = require("underscore");
require("jquery-mousewheel")($);

$(function() {
  VexTab = vextab.VexTab;
  Artist = vextab.Artist;
  Renderer = vextab.Vex.Flow.Renderer;

  Artist.DEBUG = false;
  Artist.NOLOGO = true;
  VexTab.DEBUG = false;
  var score_scroll;
  var text = "";
  autoscroll = {
    isScrolling: false,
    current_scroll: 0,
    scrollInterval: setInterval(function() {
      if (autoscroll.isScrolling){
        autoscroll.current_scroll = autoscroll.current_scroll + 16.5;
        score_scroll.scrollLeft(autoscroll.current_scroll);
      } else if (autoscroll.current_scroll != 0) {
        autoscroll.current_scroll = 0;
        score_scroll.scrollLeft(autoscroll.current_scroll);
      }
    } , 124)}

  // Create VexFlow Renderer from canvas element with id #boo
//  renderer = new Renderer($('#boo')[0], Renderer.Backends.CANVAS);
  
  // Create VexFlow Renderer from canvas element with id #boo
  renderer = new Renderer($('#boo')[0], Renderer.Backends.SVG);

  // Initialize VexTab artist and parser.
  artist = new Artist(10, 10, 24000, {scale: 0.75});
  vextab = new VexTab(artist);

//  function tinySVG(svg) {
//    var new_innards = svg.html().replace(/width="\d+"/, "width=\"2400\"");
//    new_innards = new_innards.replace(/height="\d+\.?\d+"/, "height=\"100\"");
//    svg.empty();
//    svg.append(new_innards);
//    svg.css("top","0");
//    svg.css("width","2400");
//    svg.css("height","100");
//    svg.css("margin","0 auto");
//    $(".preview").append(svg);
//  }

  function startAutoScroll(){
    $(".preview_container").css("display","none");
    autoscroll.isScrolling = true;
  }

  function stopAutoScroll(){
    autoscroll.isScrolling = false;
    $(".preview_container").css("display","block");
    //Stop the scroller and set scroll back to 0

  }

  function render() {
    try {
      vextab.reset();
      artist.reset();
      $.get("./score.txt", function(data) {
        text = data;
        vextab.parse(data);
        artist.render(renderer);
        artist.conductor.play_button.onMouseUp = function(event){
          artist.conductor.play();
          // Something's wrong with visualiztion on first play so play a second time for now
          artist.conductor.play();
          startAutoScroll();
        };
        artist.conductor.stop_button.onMouseUp = function(event){
          artist.conductor.stopPlayers();
          stopAutoScroll();
        };
      });
//      vextab.parse($("#blah").val());
      $("#error").text("");
//      if ($(".preview").children().length == 0) {
//        tinySVG($("#boo").clone());
//      }
      score_scroll = $(".score_container")
    } catch (e) {
      console.log(e);
      $("#error").html(e.message.replace(/[\n]/g, '<br/>'));
    }
  }

  function findStaveN(s, n, cut) {
     if (n < 1) return;
     var start =  s.indexOf("stave ") + 6;
     var sub = s.substring(start);
     if (n == 1) {
         return {thenOn: sub, cut: cut+start} ;
     }
     return findStaveN(sub, n-1, cut+start); 
  }

  function replaceNextMuteNoteWithDonor(s, d) {
      var open_paren = s.indexOf('(');
      var close_paren = s.indexOf(')');
      var first_asterisk = s.indexOf('*');
      if (first_asterisk > open_paren && first_asterisk < close_paren) {
        while (first_asterisk > open_paren && first_asterisk < close_paren) {
          s =  s.replace('*',d);
          first_asterisk = s.indexOf('*');
          open_paren = s.indexOf('(');
          close_paren = s.indexOf(')');
        }
        return s;
      } else {
        return s.replace('*',d);
      }
  }

  function validate_name(first_name, last_name){
    var regex =  new RegExp("^[A-Z][a-z]*$");
    if (first_name == "" || last_name == "") throw "Missing field";
    if (!regex.test(first_name)) throw "First name must have initial capitalization."
    if (!regex.test(last_name)) throw "Last name must have initial capitalization."
  }

  function validate_note(modify, note_duration) {
    //Find next duration-specifier matching note_duration and the specifier after that
    //If there's no mute between duration specifiers, find next duration-specifier and repeat
//    var start =  s.indexOf(":"+ note_duration);
//

    // Match the note duration
    var start = modify.thenOn.indexOf(":" + note_duration) + 1;
    console.log("start_first: ", start);
    var eol = modify.thenOn.indexOf("stave");

    while (start < eol && start >= 0 ) {

      // Find the next note_duration
      var next = modify.thenOn.indexOf(":", start);
      if (next <= 0) {
        next = modify.thenOn.substring(eol);
      }

      console.log('area', modify.thenOn.substring(start, next));
      if (modify.thenOn.substring(start, next).indexOf("*") >= 0) {
        var result = {cut: modify.cut + start, thenOn: modify.thenOn.substring(start)};
        console.log("result", result);
        return result;
      }
      start = modify.thenOn.indexOf(":" + note_duration, start) + 1;
      console.log("start_new: ", start);
    }
    throw "No more notes of that duration."
  }
  
  $("#buy_note").submit(function(e) {
      var first_name = "";
      var last_name = "";
      var instrument_number = ""; 

      if ($("#buy_note input[name='first_name']").val() && $("#buy_note input[name='last_name']").val()) {
          first_name = $("#buy_note input[name='first_name']").val();
          last_name = $("#buy_note input[name='last_name']").val();
          instrument_number = $("#buy_note input[name='instrument']:checked").val();
          note_duration =  $("#buy_note input[name='note_duration']:checked").val().toString();
      }

      var prev_content = text;
      var modify = findStaveN(prev_content, parseInt(instrument_number), 0);

      try {
        validate_name(first_name, last_name);
        modify = validate_note(modify, note_duration);
      }
      catch (err) {
          $("#error").html(err.replace(/[\n]/g, '<br/>'));
          console.log("Throwing error: ", err);
          e.preventDefault();
          return;
      }
      var donor_name = '+' + first_name + '_' + last_name + '+';

      var new_content = prev_content.substring(0,modify.cut)
                      + replaceNextMuteNoteWithDonor(modify.thenOn,donor_name);
      text = new_content;

      $.post("./add_donor.php", {text : text}).done(render());
      e.preventDefault();
  });

  $("#busca_mi_nota").submit(function(e) {
      var first_name = "";
      var last_name = "";
      if ($("#busca_mi_nota input[name='first_name']").val() && $("#busca_mi_nota input[name='last_name']").val()) {
          first_name = $("#busca_mi_nota input[name='first_name']").val();
          last_name = $("#busca_mi_nota input[name='last_name']").val();
      }
      try {
        validate_name(first_name, last_name);
      }
      catch (err) {
          $("#error").html(err.replace(/[\n]/g, '<br/>'));
          e.preventDefault();
          return;
      }
      var donor_name = first_name + '_' + last_name;
      var elem = $("svg").find("svg").find("g#vf-" + donor_name);

      $(".score_container").scrollLeft(elem.position().left - 600);

      elem.find("path").css({"stroke" :"red", "fill":"red"});
      $(".score_container").find("div." + donor_name).show().css({"top":elem.position().top, "left":elem.position().left});

      e.preventDefault();
  });

  $(".score_view").mousewheel(function (e,d) {
    //If the score is playing disable mousewheel functionality
    if (artist.conductor.playing_now) {
      e.preventDefault();
    } else {
      var score_scroll = $(".score_container").scrollLeft();
      $(".score_container").scrollLeft(score_scroll - 10 * d);

//      var preview_scroll = $(".preview").scrollLeft();
//      $(".preview").scrollLeft(preview_scroll - 0.75 * d);
//
//      var viewing_left = $(".viewing_box").css("left");
//      viewing_left = parseInt(viewing_left.substring(0,viewing_left.length - 2)) - 0.7 * d;
//      if (viewing_left > 0 && viewing_left < 1080) {
//        $(".viewing_box").css("left", viewing_left + "px");
//      }

      e.preventDefault();
    }
  });

  $("#blah").keyup(_.throttle(render, 250));
  render();
});
