/**
 * @author Dima Marynych (http://onjs.net)
 * @version 0.9 - 2011-06-01
 */

(function($, undefined) {
	/**
	 * bla bla
	 * @class wmanager main class
	 * @param {object} Properties
	 * Object with properties of new window
	 */
	wmanager = {
		/**
		 * @class
		 * Global vars, applied to all windows, can be extended by method wmanager.setGlobal()
		 */
		globals: {
			/**
			 * Container for windows
			 */
			winsHolder: 'body',
			/**
			 * Method called, when interface is changed, may be used for saving layout state
			 */
			save: function() {
			},
			iconsPath: 'icons/',
			lang: 'en',
			stateChanged: function() {},
			taskbar: '#taskbar'
		},
		/**
		 * Method, to set global variable
		 * @param {Object} Vars Object, containing global vars.
		 */
		set_global: function(k, v) {
			if( typeof(k) == 'object' ) {
				$.each(k, function(key, val) {
					wmanager.globals[key] = val;
				});
			} else {
				wmanager.globals[k] = v;
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
			content_id: '',
			modal: false,

			icon: true,
			iconName: 'application.png',

			group: false,
			content_id: '',

			buttMinimize: false,
			buttSettings: false,
			controlButton: [],

			resizable: true,
			draggable: true,

			confirmClose: true,

			settingsClick: function() {
			},
			/**
			 * Callback, when window opens
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window id
			 * @param [ajax_data] {mixed} Ajax Data
			 */
			ajaxLoaded: function() {
			},
			ajaxOptions: {
				cache: false,
				async: true,
				dataType: 'html',
				data: {},
				type: 'GET'
			},

			winCode: '',
			createParams: '',

			/**
			 * Callback, when window opens
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window id
			 * @param [ajax_data] {mixed} Ajax Data
			 */
			open: function() {
			},
			/**
			 * Callback, before window closing
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window content div
			 *
			 */
			beforeclose: function() {
			},
			/**
			 * Callback, after window closing
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window content div
			 *
			 */
			close: function() {
			},
			/**
			 * Callback, for window resize event
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window content div
			 *
			 */
			resize: function() {
			},
			/**
			 * Callback, for window resize start event
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window content div
			 *
			 */
			resizeStart: function() {
			},
			/**
			 * Callback, for window resize stop event
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window content div
			 *
			 */
			resizeStop: function() {
			},
			/**
			 * Callback, for window drag event
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window content div
			 *
			 */
			drag: function() {
			},
			/**
			 * Callback, for window drag stop event
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window content div
			 *
			 */
			dragStop: function() {
			},
			/**
			 * Callback, for window drag start event
			 * @param wid {number} Window id
			 * @param win {jQuery object} Window content div
			 *
			 */
			dragStart: function() {
			}
		},
		// array holds left positions of wins, to permit opening in same place
		winArrByLeft: [],
		// Object, holds all options for windows
		wins_op: {},
		// Object, holds all windows instances
		windows: {},
		addDiv: function(op) {
			var ret = $('<div />').attr({
				'id': op.wid,
				'title': op.title
			}).append(op.content).appendTo(wmanager.globals.winsHolder);
			return ret;
		},
		open: function(options) {
			// Getting wid of new win
			var wid = typeof(options.id) == 'undefined' ? wmanager.utils.genId('wmanager_') : 'wmanager_' + options.id;
			if ( !empty(options.content_id) ) {
				wid = options.content_id;
			}

			// Если окно с таким айди уже есть - переводим на него фокус или разворачиваем
			if( wmanager.windowExists(wid) ) {
				wmanager.focus(wid);
				return;
			}

			// ор - config, for creating new window
			var op = {};
			op = $.extend(op, wmanager.defaults, options, {
				wid: wid
			});

			// if window was previously closed, use its latest settings
			if( isset(wmanager.wins_op[wid]) ) {
				$.extend(op, wmanager.wins_op[wid]);
			}

			// Заголовок окна
			op.rawTitle = op.title;
			if(op.icon === true) {
				op.title = '<img src="'+ wmanager.globals.iconsPath + op.iconName +'" align="left" class="wmanager_icon" id="wmanager_icon_'+wid+'" /><span class="wmanager_'+ wid +'_title wmanager_title_text">'+ op.title +'</span>';
			}

			//
			op.minHeight = isset(op.minHeight) ? op.minHeight : op.height;
			op.minWidth = isset(op.minWidth) ? op.minWidth : op.width;

			// In mode, with given element's id in DOM, win shouldn't be deleted
			op.undeleteable = !empty(op.content_id);

			// Creating siv, for jQuery UI dialog creation
			if (empty(op.content_id)) {
				var newd = wmanager.addDiv(op);
			}

			// Проверка позиции окна
			var pos = wmanager.checkPos(op);
			
			if ($.isFunction(op.beforeOpen)) {
				op.beforeOpen(wid, win);
			}
			
			// Создаем сам диалог!
			$('#'+wid).dialog({
				bgiframe: true,
				autoOpen: true,
				height: op.height,
				width: op.width,
				minWidth: op.minWidth,
				minHeight: op.minHeight,
				//closeOnEscape: true,
				dialogClass: wid + ' wmanager_win wmanager_win_active',
				position: pos,
				modal: op.modal,
				title: op.title,
				zIndex: op.zIndex,
				resizable: op.resizable,
				draggable: op.draggable,

				resize: function(e, ui) {
					op.resize(e, ui);
				},
				resizeStop: function(e, ui) {
					op.resizeStop(e, ui);
					wmanager.globals.stateChanged();
				},
				resizeStart: function(e, ui) {
					op.resizeStart(e, ui);
				},
				
				drag: function() {
					op.drag();
					wmanager.globals.stateChanged();
				},
				dragStop: function() {
					op.dragStop();
					wmanager.globals.stateChanged();
				},
				dragStart: function() {
					op.dragStart();
				},
				
				open: function() {

					/*var winButtons = [];
					if (op.buttMinimize === true) {
						winButtons.push({
							icon: 'minus',
							title: 'Свернуть',
							func: function() {
								op.minimize();
								wmanager.minimize(wid);
								op.stateChanged();
							}
						});
					}
					if (op.buttSettings === true) {
						winButtons.push({
							icon: 'gear',
							title: 'Настройки окна',
							func: function() {
								op.settingsClick();
							}
						});
					}
					$.extend(winButtons, op.controlButton);

					wmanager.addButton(winButtons, wid);*/

					var win = $('.'+ wid);
					var wnd_content = win.find('#'+ wid);
					win.data({
						wid: wid,
						winCode: op.winCode,
						createParams: op.createParams,
						icon: op.iconName,
						createParams: op.createParams
					});
					win.draggable('option', 'containment', wmanager.globals.winsHolder);
					
					// Если это ajax запрос - делаем его
					if ( isset(op.ajaxOptions) && isset(op.ajaxOptions.url) && !empty(op.ajaxOptions.url) ) {
						// Индикатор загрузки
						$.wManager.loading(wid);
						
						$.ajax($.extend(op.ajaxOptions, {
								success: function(data){							
									if ((typeof(data) != 'undefined') && (data != null)) {
										if ($.isFunction(op.ajaxLoaded)) {
											op.ajaxLoaded(data, wid, wnd_content);
										}
									}
									
									$.wManager.stopLoading(wid);
								}
							})
						);
					}
					
					// колбек на открытие окошка
					if ($.isFunction(op.open)) {
						op.open(wid, wnd_content);
					}
				},
				focus: function() {
					// Выделяем кнопку активного окна на таскбаре
					$('.wM-collWin').removeClass('wM-collWin-active');
					$('#coll_'+wid).addClass('wM-collWin-active');

					// Затмнение всех окон, кроме активного
					$('.wM-win').removeClass('wM-win-active');
					$('.'+wid).addClass('wM-win-active');

					wmanager.globals.stateChanged();
				},
				close: function(event) {
					wmanager.globals.stateChanged();
					op.close(event);
					wmanager.close(wid);
				},
				beforeclose: function(event) {
					if ($('#wm_confirm_'+ op.wid).length != 0 ) {
						$('#wm_confirm_'+ op.wid).remove();
					}

					if( op.confirmClose === true) {
						var msg = $('<div>'+ op.confirmCloseMsg + '</div>');
						var ok = $('<input type="button" value="'+ op.confirmCloseOk + '" />')
						.click( function() {
							wmanager.close(wid);
							$('#wm_confirm_'+ op.wid).remove();
						});
						var cancel = $('<input type="button" value="'+ op.confirmCloseCancel + '" />')
						.click( function() {
							$('#wm_confirm_'+ op.wid).remove();
						});
						msg = msg.add(ok).add(cancel);

						var zIndex = +win.css('zIndex') + 1;
						var pos = $('.'+ op.wid).offset();
						var top = parseInt( pos.top, 10) + 22;
						var left = parseInt( pos.left, 10) + $('.'+ op.wid).width() - 50;
						$('<div style="top:'+ top +'px; left:'+ left +'px; width: 110px; z-index: ' + zIndex  + '" class="wm_tooltip" id="wm_confirm_'+ op.wid +'"></div>')
						.html(msg).appendTo(wmanager.globals.winsHolder);

						return false;
					}

					op.beforeclose(event);
				}
			});

			var win = $('#'+ wid);
			/**
			 * Window instance, with basic methods
			 */
			var ret = {
				wid: wid,
				win: win,
				minimize: function() {
					wmanager.minimize(this.wid);
				},
				close: function() {
					wmanager.close(this.wid);
				},
				show: function() {
					wmanager.focus(this.wid);
				},
				focus: function() {
					wmanager.focus(this.wid)
				},
				showError: function(text, timer) {
					wmanager.showError(this.wid, text, timer);
				},
				showMsg: function(text, timer) {
					wmanager.showMsg(this.wid, text, timer);
				},
				hideMsgs: function() {
					wmanager.hideMsgs(this.wid);
				}
			};
			
			//опции сохраняем в глобальный массив для доступа и изменения извне
			wmanager.wins_op[wid] = op;
			// array of window instatnces
			wmanager.windows[wid] = ret;
			return ret;
		},
		/**
		 * Method, for checking new window position. If, on given position, already exists window - it generates new coords
		 * @param {object} Windows properties
		 * @return boolean
		 */
		checkPos: function(op) {
			op.left = parseInt(op.left, 10);
			op.top = parseInt(op.top, 10);

			if( isset( wmanager.winArrByLeft[op.left]) ) {
				op.left += 25;
				op.top += 25;
				// Проверяем новые значения
				return wmanager.checkPos(l, t);
			} else {
				return [op.left, op.top];
			}
		},
		/**
		 * Method, for checking, if window with given wid exists
		 * @param {wid} Window id
		 * @return boolean
		 */
		windowExists: function(wid) {
			return isset(wmanager.windows[wid]);
		},
		utils: {
			genId: function genId(start) {
				var nid = start + Math.floor(Math.random() * 1000);
				if( $(nid).length === 0 ) {
					return nid;
				} else {
					return wmanager.utils.genId();
				}
			}
		},
		lang: {
			en: {
				'close_confirm': 'Are you sure?',
				'close_confirm_ok': 'Close',
				'close_confirm_cancel': 'Cancel'
			}
		}
	};
	
	/* PHPJS functions */
	var empty = function(mixed_var) {
		// http://kevin.vanzonneveld.net
		// +   original by: Philippe Baumann
		// +      input by: Onno Marsman
		// +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +      input by: LH
		// +   improved by: Onno Marsman
		// +   improved by: Francesco
		// +   improved by: Marc Jansen
		// +   input by: Stoyan Kyosev (http://www.svest.org/)
		// *     example 1: empty(null);
		// *     returns 1: true
		// *     example 2: empty(undefined);
		// *     returns 2: true
		// *     example 3: empty([]);
		// *     returns 3: true
		// *     example 4: empty({});
		// *     returns 4: true
		// *     example 5: empty({'aFunc' : function () { alert('humpty'); } });
		// *     returns 5: false

		var key;

		if (mixed_var === "" ||
		mixed_var === 0 ||
		mixed_var === "0" ||
		mixed_var === null ||
		mixed_var === false ||
		typeof mixed_var === 'undefined'
		) {
			return true;
		}

		if (typeof mixed_var == 'object') {
			for (key in mixed_var) {
				return false;
			}
			return true;
		}

		return false;
	};
	
	var isset = function() {
		// http://kevin.vanzonneveld.net
		// +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   improved by: FremyCompany
		// +   improved by: Onno Marsman
		// *     example 1: isset( undefined, true);
		// *     returns 1: false
		// *     example 2: isset( 'Kevin van Zonneveld' );
		// *     returns 2: true

		var a=arguments, l=a.length, i=0;

		if (l===0) {
			throw new Error('Empty isset');
		}

		while (i!==l) {
			if (typeof(a[i])=='undefined' || a[i]===null) {
				return false;
			} else {
				i++;
			}
		}
		return true;
	};
	var fbug = function(s) {
		if(typeof console != 'undefined')
			console.log(s);
	}
	
	
	
	
	
	$.widget("ui.wmanager", {
		// default options
		options: {
			
		},
		_create: function() {
			fbug(this)
			wmanager.open($.extend(this.options, {content: this.element}));
		}
	});

})(jQuery);