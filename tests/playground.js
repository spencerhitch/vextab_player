// Load VexTab module.
vextab = require("vextab");
$ = require("jquery");
_ = require("underscore");

$(function() {
  VexTab = vextab.VexTab;
  Artist = vextab.Artist;
  Renderer = vextab.Vex.Flow.Renderer;

  Artist.DEBUG = false;
  Artist.NOLOGO = true;
  VexTab.DEBUG = false;

  // Create VexFlow Renderer from canvas element with id #boo
//  renderer = new Renderer($('#boo')[0], Renderer.Backends.CANVAS);
  
  // Create VexFlow Renderer from canvas element with id #boo
  renderer = new Renderer($('#boo')[0], Renderer.Backends.SVG);

  // Initialize VexTab artist and parser.
  artist = new Artist(10, 10, 600, {scale: 0.8});
  vextab = new VexTab(artist);

  function render() {
    try {
      vextab.reset();
      artist.reset();
      vextab.parse($("#blah").val());
      artist.render(renderer);
      $("#error").text("");
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
         console.log("returning", sub);
         return {thenOn: sub, cut: cut+start} ;
     }
     return findStaveN(sub, n-1, cut+start); 
  }

  function replaceNextMuteNoteWithDonor(s, d) {
      return s.replace('*',d);
  }

  function validate(first_name, last_name){
    var regex =  new RegExp("[A-Z][a-z]*");
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
 
  $("#blah").keyup(_.throttle(render, 250));
  render();
});
