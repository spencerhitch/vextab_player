# VexTab Conductor
# Copyright 2012 Mohit Cheppudira <mohit@muthanna.com>
#
# This class is responsible for rendering the elements
# parsed by Vex.Flow.VexTab.

Vex = require 'vexflow'
Player = require './player.coffee'
_ = require 'underscore'
$ = require 'jquery'
paper = require 'paper'

class Vex.Flow.Conductor
  @DEBUG = false
  @INSTRUMENTS_LOADED = {}
  L = (args...) -> console?.log("(Vex.Flow.Conductor)", args...) if Vex.Flow.Conductor.DEBUG

  Fraction = Vex.Flow.Fraction
  RESOLUTION = Vex.Flow.RESOLUTION
  noteValues = Vex.Flow.Music.noteValues
  drawDot = Vex.drawDot

  INSTRUMENTS = {
    "acoustic_grand_piano": 0,
    "acoustic_guitar_nylon": 24,
    "acoustic_guitar_steel": 25,
    "electric_guitar_jazz": 26,
    "distortion_guitar": 30,
    "electric_bass_finger": 33,
    "electric_bass_pick": 34,
    "trumpet": 56,
    "brass_section": 61,
    "soprano_sax": 64,
    "alto_sax": 65,
    "tenor_sax": 66,
    "baritone_sax": 67,
    "flute": 73,
    "synth_drum": 118,
    "violin": 40,
    "viola": 41,
    "cello": 42,
    "timpani": 47,
    "oboe": 68
  }

  constructor: (@artist, options) ->
    L "Initializing conductor: ", options
    @players = []
    @instruments = []
    @playing_now = false
    @options =
      tempo: 120
      show_controls: true
      overlay_class: "vextab-conductor"

    _.extend(@options, options) if options?
    L "Using soundfonts in: #{@options.soundfont_url}"
    @paper = null
    @reset()

  setArtist: (artist) ->
    @artist = artist
    @reset()

  getPlayer: (i) ->
    return @players[i]

  addPlayer: (player) ->
    @instruments.push(player.instrument)
    @players.push(player)

  setTempo: (tempo) ->
    L "New tempo: ", tempo
    @options.tempo = tempo
    @reset()

  reset: ->
    @artist.attachConductor(this)
    if @marker?
      @marker.remove()
      @marker = null
    @stopPlayers()

  getOverlay = (context, scale, overlay_class) ->
    if context.canvas?
      canvas = context.canvas
      height = canvas.height
      width = canvas.width
    else if context.svg?
      canvas = context.element
      height = 25
      width = context.width

    overlay = $('<canvas>')
    overlay.css("position", "absolute")
    overlay.css("id", "play_buttons")
    overlay.css("left", 10)
    overlay.css("top", 5)
    overlay.addClass(overlay_class)

    $(canvas).parent().before(overlay)
    ctx = Vex.Flow.Renderer.getCanvasContext(overlay.get(0), width, height)
    ctx.scale(scale, scale)

    ps = new paper.PaperScope()
    ps.setup(overlay.get(0))

    return {
      paper: ps
      canvas: overlay.get(0)
    }

  getPaper: ->
    return @paper

  removeControls: ->
    @play_button.remove() if @play_button?
    @stop_button.remove() if @stop_button?
    @paper.view.draw() if @paper?

  render: ->
    @reset()
    data = @artist.getConductorData()
    @context = data.context
    @scale = data.scale

    if not @paper
      overlay = getOverlay(data.context, data.scale, @options.overlay_class)
      @paper = overlay.paper

    @loading_message = new @paper.PointText(35, 12)

    if @options.show_controls
      @play_button = new @paper.Path.RegularPolygon(new @paper.Point(25,10), 3, 7, 7)
      @play_button.fillColor = '#396'
      @play_button.opacity = 0.8
      @play_button.rotate(90)
      @play_button.onMouseUp = (event) =>
        @play()

      @stop_button = new @paper.Path.Rectangle(3,3,10,10)
      @stop_button.fillColor = '#396'
      @stop_button.opacity = 0.8
      @stop_button.onMouseUp = (event) =>
        @stopPlayers()

      MIDI.loadPlugin
        soundfontUrl: @options.soundfont_url
        instruments: @instruments

    @paper.view.draw()

  stopPlayers: ->
    L "Stopping players"
    _.each(@players, (player) -> player.stop())
    @play_button.fillColor = '#396' if @play_button?
    @paper.view.draw() if @paper?
    @playing_now = false

  getPlayersLength: ->
    return @players.length


  startPlayers: ->
    L "Starting Players"
    @playing_now = true
    @play_button.fillColor = '#a36' if @play_button?
    _.each(@players, (player) -> player.start())

  play: ->
    # underscore each is synchronous so this probably isn't going to work correctly,
    # might need async.js each method
    self = this
    flag = true
    _.each(@instruments, (instrument) ->
      if  not Vex.Flow.Conductor.INSTRUMENTS_LOADED[instrument] or @loading
        flag = false
    )
    if flag
      @startPlayers()
    else
#      self.loading_message.content = "Loading instruments..."
#      self.loading_message.fillColor = "green"
#      self.loading = true
#      self.paper.view.draw()
      _.each(@players, (player) ->
        Vex.Flow.Conductor.INSTRUMENTS_LOADED[player.instrument] = true
        MIDI.programChange(player.channelNumber, INSTRUMENTS[player.instrument]))
      self.loading_message.content = ""
      self.loading = false
      self.startPlayers()

module.exports = Vex.Flow.Conductor

