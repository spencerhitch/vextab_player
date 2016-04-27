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

  function tinySVG(svg) {
    var new_innards = svg.html().replace(/width="\d+"/, "width=\"2400\"");
    new_innards = new_innards.replace(/height="\d+\.?\d+"/, "height=\"100\"");
    svg.empty();
    svg.append(new_innards);
    svg.css("top","0");
    svg.css("width","2400");
    svg.css("height","100");
    svg.css("margin","0 auto");
    $(".preview").append(svg);
  }

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
      vextab.parse($("#blah").val());
      artist.render(renderer);
      $("#error").text("");
      tinySVG($("#boo").clone())
      artist.conductor.play_button.onMouseUp = function(event){
        artist.conductor.play();
        // Something's wrong with visualiztion on first play so play a second time for now
        artist.conductor.play();
        startAutoScroll();
      };
      artist.conductor.stop_button.onMouseUp = function(event){
        artist.conductor.stopPlayers();
        // Something's wrong with visualiztion on first play so play a second time for now
        stopAutoScroll();
      };
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
      return s.replace('*',d);
  }

  function validate(first_name, last_name){
    var regex =  new RegExp("^[A-Z][a-z]*$");
    if (first_name == "" || last_name == "") throw "Missing field";
    if (!regex.test(first_name)) throw "First name must have initial capitalization."
    if (!regex.test(last_name)) throw "Last name must have initial capitalization."
  }
  
  $("#buy_note").submit(function(e) {
      var first_name = "";
      var last_name = "";
      var instrument_number = ""; 
      if ($("input[name='first_name']").val() && $("input[name='last_name']").val()) {
          first_name = $("input[name='first_name']").val();
          last_name = $("input[name='last_name']").val();
          instrument_number = $("input[name='instrument']:checked").val();
      }
      try {
        validate(first_name, last_name);
      }
      catch (err) {
          $("#error").html(err.replace(/[\n]/g, '<br/>'));
          e.preventDefault();
          return;
      }
      var donor_name = '+' + first_name + '_' + last_name + '+'
      var prev_content = $("#blah").val();
      var modify = findStaveN(prev_content, parseInt(instrument_number), 0);
      var new_content = prev_content.substring(0,modify.cut)
                      + replaceNextMuteNoteWithDonor(modify.thenOn,donor_name);
      $("#blah").replaceWith("<textarea id=\"blah\">" + new_content + "</textarea>");
      render();
      e.preventDefault();
  });
 
  $(".score_view").mousewheel(function (e,d) {
    //If the score is playing disable mousewheel functionality
    if (artist.conductor.playing_now) {
      e.preventDefault();
    } else {
      var score_scroll = $(".score_container").scrollLeft();
      $(".score_container").scrollLeft(score_scroll - 10 * d);

      var preview_scroll = $(".preview").scrollLeft();
      $(".preview").scrollLeft(preview_scroll - 0.75 * d);

      var viewing_left = $(".viewing_box").css("left");
      viewing_left = parseInt(viewing_left.substring(0,viewing_left.length - 2)) - 0.7 * d;
      if (viewing_left > 0 && viewing_left < 1080) {
        $(".viewing_box").css("left", viewing_left + "px");
      }

      e.preventDefault();
    }
  });

  $("#blah").keyup(_.throttle(render, 250));
  render();
});
