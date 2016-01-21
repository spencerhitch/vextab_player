// Load VexTab module.
vextab = require("vextab");
$ = require("jquery");
_ = require("underscore");

$(function() {
  VexTab = vextab.VexTab;
  Artist = vextab.Artist;
  Renderer = vextab.Vex.Flow.Renderer;
  Player = vextab.Player;

  Artist.DEBUG = false;
  VexTab.DEBUG = false;
  Player.DEBUG = true;

  // Create VexFlow Renderer from canvas element with id #boo
  renderer = new Renderer($('#boo')[0], Renderer.Backends.CANVAS);

  // Initialize VexTab artist and parser.
  artist = new Artist(10, 10, 600, {scale: 0.8});
  player = new Player(artist);
  vextab = new VexTab(artist);

  function render() {
    try {
      vextab.reset();
      artist.reset();
      player.reset();
      vextab.parse($("#blah").val());
      artist.render(renderer);
      $("#error").text("");
    } catch (e) {
      console.log(e);
      $("#error").html(e.message.replace(/[\n]/g, '<br/>'));
    }
  }

  $("#blah").keyup(_.throttle(render, 250));
  render();
});
