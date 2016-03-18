// Load VexTab module.
vextab = require("vextab");
$ = require("jquery");
_ = require("underscore");

$(function() {
  VexTab = vextab.VexTab;
  Artist = vextab.Artist;
  Renderer = vextab.Vex.Flow.Renderer;

  Artist.DEBUG = true;
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

  
  $("#buy_note").submit(function(e) {
      var first_name = "";
      var last_name = "";
      var instrument_number = ""; 
      if ($("input[name='first_name']").val() && $("input[name='last_name']").val()) {
          first_name = $("input[name='first_name']").val();
          last_name = $("input[name='last_name']").val();
          instrument_number = $("input[name='instrument']:checked").val();
      }
      var donor_name = '+' + first_name + '_' + last_name + '+'
      console.log("Form submitted: ", donor_name, instrument_number);
      var prev_content = $("#blah").val();
      console.log("finding stave: ", prev_content.indexOf("stave"));
      
      // Find Ms if they're not in ++s annotations, options, etc. 
      // Maybe I can just look at the vextab artist and get the line
      // and column number of the mutes
      e.preventDefault();
  });
 
  $("#blah").keyup(_.throttle(render, 250));
  render();
});
