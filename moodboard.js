/**
===========================================
Really simple jQuery-based moodboard plugin
===========================================

Offers previous / playpause / next controls

::
    <div class="slides">
        <div class="slide">...</div>
        <div class="slide">...</div>
        <div class="slide">...</div>
    </div>

Options:
========

* autostart
* width
* height
* slide_time
* controls

Options which aren't thought through yet:
-----------------------------------------

* _init_slides
* _init_controls
* _reveal

Commands:
=========

* previous
* next
* jump
* play
* pause
* playpause
* destroy


State:
======

All state is stored in the ``moodboard`` data object attached to the
moodboard slide container. The important attributes are:

* slides
* widths
* heights
* count
* current
* interval

*/
;(function($) {

    /**
    Standard implementation of _init_slides
    =======================================

    Centers the content in all slides and sets opacity to zero on each
    slide except the first.
    */
    function _init_slides($mb, data) {
        if (!data.width)
            data.width = $mb.width();
        if (!data.height)
            data.height = $mb.height();

        for (var i=0; i<data.slides.length; i++) {
            data.slides[i].css({
                width: data.widths[i],
                height: data.heights[i],
                left: Math.max(0, (data.width - data.widths[i]) / 2), // don't go below zero
                top: Math.max(0, (data.height - data.heights[i]) / 2), // don't go below zero
                opacity: (i == 0) ? 1 : 0
                });
        }
    }

    /**
    Adds previous / playpause / next controls to the moodboard
    ==========================================================

    A CSS class ``initial`` is applied for one second so that the presence
    of these UI elements can be revealed for a moment.
    */
    function _init_controls($mb, data) {
        var $controls = $('<div class="controls" />').appendTo($mb);

        $('<a class="previous" />').appendTo($controls).bind('click', function() {
            $mb.moodboard('previous'); });
        $('<a class="play" />').appendTo($controls).bind('click', function() {
            $mb.moodboard('playpause'); });
        $('<a class="next" />').appendTo($controls).bind('click', function() {
            $mb.moodboard('next'); });
    }

    /**
    Reveal the slide with index ``newidx``
    =======================================

    This method is responsible for updating state in ``data``.
    */
    function _reveal($mb, data, newidx) {
        data.slides[data.current].css({'z-index': 100, opacity: 0});
        data.slides[newidx].css({'z-index': 101, opacity: 1});
        data.current = newidx;
    }

    var defaults = {
        width: null,
        height: null,
        slide_time: 2500,
        autostart: true,
        controls: true,

        _init_slides: _init_slides,
        _init_controls: _init_controls,
        _reveal: _reveal,
        };

    function _do_initialize($moodboard, options) {
        var $slides = $moodboard.find('.slide'),
            data = {
                count: $slides.length,
                current: 0,
                interval: null,
                slides: [],
                widths: [],
                heights: []
                };

        data = $.extend(data, defaults, options);

        // The slides cannot be initialized on document.ready. We have to wait
        // for window.load to determine widths/heights of each slide. We create
        // a closure for this purpose to prevent running methods on a
        // ``$moodboard`` object which might not be the same anymore when we
        // enter the callback.
        (function($moodboard, $slides, data) {
            $(window).load(function() {
                $slides.each(function() {
                    var $slide = $(this);
                    data.slides.push($slide);
                    data.heights.push($slide.height());
                    data.widths.push($slide.width());
                });

                data._init_slides($moodboard, data);

                if (data.controls)
                    data._init_controls($moodboard, data);

                $moodboard.data('moodboard', data);

                if (data.autostart && data.count > 1)
                    $moodboard.moodboard('playpause');

                $moodboard.addClass('moodboard');
            });
        })($moodboard, $slides, data);
    }

    /**
    Command handler wrapper
    =======================

    This method handles the data management and runs the passed function
    for every object matched by the jQuery command. This is (for now) a
    purely internal method.

    Additional arguments passed to the ``$('.slides').moodboard('cmd', arg1, ...)``
    invocation are forwarded to the passed ``_fn`` method.
    */
    function _handler(_fn) {
        return function() {
            // Convert arguments into a proper javascript array object.
            var args = Array.prototype.slice.call(arguments);

            return this.each(function() {
                var $moodboard = $(this),
                    data = $moodboard.data('moodboard'),
                    ret = _fn.apply(null, new Array($moodboard, data).concat(args));

                if (ret)
                    $moodboard.data('moodboard', ret);
            });
        }
    }

    var methods = {
        init: function(options) {
            return this.each(function() {
                var $moodboard = $(this),
                    data = $moodboard.data('moodboard');

                if (!data)
                    _do_initialize($moodboard, options);
            });
        },

        /**
        Proceed to next slide
        =====================
        */
        next: _handler(function($mb, data) {
            if (data.interval) $mb.moodboard('pause');
            data._reveal($mb, data, (data.current + 1) % data.count);
            return data;
        }),

        /**
        Proceed to previous slide
        =========================
        */
        previous: _handler(function($mb, data) {
            if (data.interval) $mb.moodboard('pause');
            data._reveal($mb, data, (data.current + data.count - 1) % data.count);
            return data;
        }),

        /**
        Proceed to the given slide
        ==========================

        Slide numbers are modulo'ed with the slide count::

            $('.slides').moodboard('jump', 3);
        */
        jump: _handler(function($mb, data, newidx) {
            if (data.interval) $mb.moodboard('pause');
            data._reveal($mb, data, newidx % data.count);
            return data;
        }),

        /**
        Starts / stops the slideshow timer
        ==================================
        */
        playpause: _handler(function($mb, data) {
            if (data.interval)
                $mb.moodboard('pause');
            else
                $mb.moodboard('play');
        }),

        /**
        Starts the slideshow when it isn't already running
        ==================================================

        Adds a ``playing`` CSS class to the moodboard element.
        */
        play: _handler(function($mb, data) {
            if (!data.interval) {
                $mb.addClass('playing');
                data.interval = setInterval(function() {
                    data._reveal($mb, data, (data.current + 1) % data.count);
                    $mb.data('moodboard', data);
                }, data.slide_time);
            }
        }),

        /**
        Stop the slideshow
        ==================

        Removes the ``playing`` CSS class on the moodboard element.
        */
        pause: _handler(function($mb, data) {
            if (data.interval) {
                clearInterval(data.interval);
                data.interval = null;
                $mb.removeClass('playing');
                return data;
            }
        }),

        /**
        Destroy the moodboard
        =====================

        Stops timers and removes dynamically added elements.
        */
        destroy: _handler(function($mb, data) {
            if (data.interval) clearInterval(data.interval);
            $mb.removeClass('playing').find('.controls').remove();
            return null;
        })
    };

    /**
    Main entry point
    ================

    Moodboard initialization::

        $('.slides').moodboard([optional options object]);

    Commands::

        $('.slides').moodboard('command', [argument1, argument2, ...]);
    */
    $.fn.moodboard = function(method) {
        if (methods[method])
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        else if (typeof method === 'object' || !method)
            return methods.init.apply(this, arguments);
        else
            $.error('Method ' + method + ' does not exist on jQuery.moodboard');
    };

    // expose defaults
    $.fn.moodboard.defaults = defaults;
})(jQuery);

