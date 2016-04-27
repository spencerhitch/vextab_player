# VexTab Player
# Copyright 2012 Mohit Cheppudira <mohit@muthanna.com>
#
# This class is responsible for rendering the elements
# parsed by Vex.Flow.VexTab.

Vex = require 'vexflow'
_ = require 'underscore'
$ = require 'jquery'
paper = require 'paper'

class Vex.Flow.Player
  @DEBUG = false
  L = (args...) -> console?.log("(Vex.Flow.Player)", args...) if Vex.Flow.Player.DEBUG

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

  constructor: (@staves, options) ->
    L "Initializing player: ", options
    @options =
      tempo: 120
      show_controls: true
      soundfont_url: "../soundfont/"
      overlay_class: "vextab-player"
 
    _.extend(@options, options) if options?
    L "Using soundfonts in: #{@options.soundfont_url}"
    @interval_id = null
    @conductor = null
    @paper = null
    @channelNumber = 0
    @instrument = "acoustic_grand_piano"
    @reset()

  pushToStaves: (voice) ->
    @staves.push(voice)

  setConductor: (conductor) ->
    @conductor = conductor

  setChannelNumber: (i) ->
    @channelNumber = i

  setStaves: (staves) ->
    @staves = staves
    @reset()

  setTempo: (tempo) ->
    L "New tempo: ", tempo
    @options.tempo = tempo
    @reset()

  setInstrument: (instrument) ->
    L "Setting instrument." , instrument
    if instrument not in _.keys(INSTRUMENTS)
      throw new Vex.RERR("PlayerError", "Invalid instrument: " + instrument)
    @instrument = instrument
    @reset()

  reset: ->
    @tick_notes = {}
    @all_ticks = []
    @tpm = @options.tempo * (RESOLUTION / 4)
    @refresh_rate = 25 #ms: 50 = 20hz
    @ticks_per_refresh = @tpm / (60 * (1000/@refresh_rate))
    @total_ticks = 0
    if @marker?
      @marker.remove()
      @marker = null
    @stop()

  getOverlay = (context, scale, overlay_class) ->
    if context.canvas?
      canvas = context.canvas
      height = canvas.height
      width = canvas.width
    else if context.svg?
      canvas = context.element
      height = context.height
      width = context.width

    overlay = $('<canvas>')
    overlay.css("position", "relative")
    overlay.css("top", -560)
    overlay.css("z-index", "-1")
    overlay.css("left", 0)
    overlay.addClass(overlay_class)

    $(canvas).after(overlay)
    ctx = Vex.Flow.Renderer.getCanvasContext(overlay.get(0), width, height)
    ctx.scale(scale, scale)

    ps = new paper.PaperScope()
    ps.setup(overlay.get(0))

    return {
      paper: ps
      canvas: overlay.get(0)
    }


  render: ->
    @reset()
    @scale = @conductor.scale
    @context = @conductor.context

    if not @paper
      overlay = getOverlay(@context, @scale, @options.overlay_class)
      @paper = overlay.paper

    @marker = new @paper.Path.Rectangle(0,0,13,65)
    @paper.view.draw()

    staves = @staves

    total_ticks = new Fraction(0, 1)
    for stave in staves
      # possibly set instrument from stave here?
      max_voice_tick = new Fraction(0, 1)
      for voice in stave
        total_voice_ticks = new Fraction(0, 1)
        for note in voice.getTickables()
          unless note.shouldIgnoreTicks()
            abs_tick = total_ticks.clone()
            abs_tick.add(total_voice_ticks)
            abs_tick.simplify()
            key = abs_tick.toString()

            if _.has(@tick_notes, key)
              @tick_notes[key].notes.push(note)
            else
              @tick_notes[key] =
                tick: abs_tick
                value: abs_tick.value()
                notes: [note]

            total_voice_ticks.add(note.getTicks())

        if total_voice_ticks.value() > max_voice_tick.value()
          max_voice_tick.copy(total_voice_ticks)

      total_ticks.add(max_voice_tick)

    @all_ticks = _.sortBy(_.values(@tick_notes), (tick) -> tick.value)
    @total_ticks = _.last(@all_ticks)

  updateMarker: (x, y) ->
    L "update marker: ", x, y
    @marker.fillColor = '#369'
    @marker.opacity = 0.4
    @marker.setPosition(new @paper.Point(x * @scale, y * @scale))
    @paper.view.draw()

  playNote: (notes) ->
    L "(#{@current_ticks}) playNote: ", notes

    for note in notes
      x = note.getAbsoluteX() + 4
      y = note.getStave().getYForLine(2)
      @updateMarker(x, y) if @paper?
      continue if note.isRest()

      keys = note.getPlayNote()
      duration = note.getTicks().value() / (@tpm/60)
      for key in keys
        [note, octave] = key.split("/")
        note = note.trim().toLowerCase()
        note_value = noteValues[note]
        continue unless note_value? and note_value.int_val != -1

        midi_note = (24 + (octave * 12)) + noteValues[note].int_val
        MIDI.noteOn(@channelNumber, midi_note, 127, 0)
        MIDI.noteOff(@channelNumber, midi_note, duration)

  refresh: ->
    if @done
      @stop()
      return

    @current_ticks += @ticks_per_refresh

    if @current_ticks >= @next_event_tick and @all_ticks.length > 0
      @playNote @all_ticks[@next_index].notes
      @next_index++
      if @next_index >= @all_ticks.length
        @done = true
      else
        @next_event_tick = @all_ticks[@next_index].tick.value()

  stop: ->
    L "Stop"
    window.clearInterval(@interval_id) if @interval_id?
    @paper.view.draw() if @paper?
    @interval_id = null
    @current_ticks = 0
    @next_event_tick = 0
    @next_index = 0
    @done = false

  start: ->
    @stop()
    L "In start(): ", @instrument, INSTRUMENTS[@instrument]
#    MIDI.programChange(@channelNumber, INSTRUMENTS[@instrument])
    @render() # try to update, maybe notes were changed dynamically
    @interval_id = window.setInterval((() => @refresh()), @refresh_rate)

module.exports = Vex.Flow.Player
