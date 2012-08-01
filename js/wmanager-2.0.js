/**
 * @author Dima Marynych (http://onjs.net)
 * @version 0.9 - 2011-06-01
 */

(function(window, $, undefined) {


    var wmanager = {
        /**
         * @class
         * Global vars, applied to all windows, can be extended by method wmanager.configure()
         */
        global_config: {

            /**
             * Method called, when interface is changed, may be used for saving layout state
             */
            saveHandler: function() {},
            stateChanged: function() {},
            sessionWriter: function(ar) {
                store.set('wmanager_save', ar);
            },
            sessionReader: function() {
                return store.get('wmanager_save');
            }
        },
        /**
         * Method, to set global variable
         * @param {Object} Vars Object, containing global vars.
         */
        configure: function(k, v) {
            if( typeof(k) == 'object' ) {
                $.each(k, function(key, val) {
                    wmanager.globals[key] = val;
                });
            }
            else {
                wmanager.globals[k] = v;
            }
        },
        /**
         * Method, to set default values for variables
         * @param {Object} Vars Object, containing default vars.
         */
        setDefaults: function(k, v) {
            if( typeof(k) == 'object' ) {
                $.each(k, function(key, val) {
                    wmanager.defaults[key] = val;
                });
            }
            else {
                wmanager.defaults[k] = v;
            }
        },
        /**
         * @class
         * Properties, for creating wmanager instance
         */
        defaults: {
            left: false,
            top: false,
            width: 'auto',
            height: 'auto',
            minWidth: 200,
            minHeight: 200,
            maxWidth: 900,
            maxHeight: 900,
            zIndex: 10000,

            title: '',
            content: '',

            win_code: '',
            create_params: '',
            dom_holder: 'body',
            lang: 'en',

            icon: false,


            controlButtons: [],

            resizable: true,
            draggable: true,

            confirmClose: false,

            /**
             * Callback, when window opens
             * @param wid {number} Window id
             * @param win {jQuery object} Window id
             * @param [ajax_data] {mixed} Ajax Data
             */
            ajaxLoaded: function() {},

            /**
             * Options for ajax requests (can be any of jQuery's vars (http://api.jquery.com/jQuery.ajax/#jQuery-ajax-settings))
             */
            ajaxOptions: {
                dataType: 'html',
                data: {},
                type: 'GET'
            },



            /**
             * Callback, when window opens
             * @param wid {number} Window id
             * @param win {jQuery object} Window id
             * @param [ajax_data] {mixed} Ajax Data
             */
            open: function(wid, win) {},
            /**
             * Callback, before window opens
             * @param wid {number} Window id
             * @param win {jQuery object} Window content div
             *
             */
            beforeOpen: false,
            /**
             * Callback, before window closing
             * @param wid {number} Window id
             * @param win {jQuery object} Window content div
             *
             */
            beforeClose: false,
            /**
             * Callback, after window closing
             * @param wid {number} Window id
             * @param win {jQuery object} Window content div
             *
             */
            close: false,
            /**
             * Callback, for window resize event
             * @param wid {number} Window id
             * @param win {jQuery object} Window content div
             *
             */
            resize: false,
            /**
             * Callback, for window resize start event
             * @param wid {number} Window id
             * @param win {jQuery object} Window content div
             *
             */
            resizeStart: false,
            /**
             * Callback, for window resize stop event
             * @param wid {number} Window id
             * @param win {jQuery object} Window content div
             *
             */
            resizeStop: false,
            /**
             * Callback, for window drag event
             * @param wid {number} Window id
             * @param win {jQuery object} Window content div
             *
             */
            drag: false,
            /**
             * Callback, for window drag stop event
             * @param wid {number} Window id
             * @param win {jQuery object} Window content div
             *
             */
            dragStop: false,
            /**
             * Callback, for window drag start event
             * @param wid {number} Window id
             * @param win {jQuery object} Window content div
             *
             */
            dragStart: false
        },


        _id_prefix: 'wmanager',



        // Object, holds all windows instances
        windows: {},
        // object, with methods, fow wins opening
        winRunners: {},

        open: function(options) {
            // Getting wid of new window
            var wid = (options.id === undefined)
                ? get_unique_dom_id(wmanager._id_prefix +'_')
                : wmanager._id_prefix +'_' + options.id;

            // If windows with this id exists - just showing and focusing it
            /*if( wmanager.windowExists(wid) ) {
                // window is hidden
                if(wmanager.windowHidden(wid)) {
                    $('.'+ wid).show();
                    return;
                }
                // window visible, moving focus on it
                else {
                    wmanager.focus(wid);
                    return;
                }
            }*/

            // op - config, for creating new window
            var op = $.extend(true, {}, wmanager.defaults, options, {
                wid: wid
            });

            // if window was previously closed, use its latest settings
            /*if( wmanager.wins_op[wid] !== undefined ) {
                $.extend(op, wmanager.wins_op[wid]);
            }*/

            op.rawTitle = op.title;
            op.title = '<span class="'+ wmanager._id_prefix +'_'+ wid +'_title '+ wmanager._id_prefix +'_title_text">'+ op.title +'</span>';

            // Creating div, for jQuery UI dialog creation
            var win = wmanager.addDiv(op);

            // beforeOpen callback
            if ($.isFunction(op.beforeOpen) && op.beforeOpen(op, win) === false) {
                return false;
            }



        },

        addDiv: function(op) {
            return $('<div></div>').attr({
                'id': op.wid,
                'title': op.title
            }).append(op.content).appendTo(op.dom_holder);
        }
    };


    var wmWindow = function(wid, win) {
        this.wid =  wid;
        this.win = win;
        this.hide = function() {
            wmanager.hide(this.wid);
        };
        this.close = function() {
            wmanager.close(this.wid);
        };
        this.show = function() {
            wmanager.focus(this.wid);
        };
        this.focus = function() {
            wmanager.focus(this.wid)
        };
        this.showError = function(text, timer) {
            wmanager.showError(this.wid, text, timer);
        };
        this.showMsg = function(text, timer, css_class) {
            wmanager.showMsg(this.wid, text, timer, css_class);
        };
        this.hideMsgs = function() {
            wmanager.hideMsgs(this.wid);
        };
        this.loading = function() {
            wmanager.loading(this.wid);
        };
        this.stopLoading = function() {
            wmanager.stopLoading(this.wid);
        };
        this.addButton = function(button) {
            wmanager.addButton(this.wid, button);
        };
        this.removeButton = function(button_id) {
            wmanager.removeButton(this.wid, button_id);
        };
        this.refresh = function() {
            wmanager.refresh(this.wid);
        };
    };

    // some helpers
    var fbug = function(s) {
        if(console !== undefined)
            console.log(s);
    };

    var get_unique_dom_id = function genId(start) {
        var nid = start + Math.floor(Math.random() * 10000);
        if( $(nid).length === 0 ) {
            return nid;
        } else {
            return get_unique_dom_id(start);
        }
    };

    window.wmanager = wmanager;

})(window, jQuery);