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
			stateChanged: false,
			taskbar: false,
			sessionWriter: function(ar) {
				fbug('sessionWriter')
				store.set('wmanager_save', ar);
			},
			sessionReader: function() {
				fbug('sessionReader')
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
			beforeclose: false,
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
			dragStart: false,
		},
		// array holds left positions of wins, to permit opening in same place
		winArrByLeft: [],
		// Object, holds all options for windows
		wins_op: {},
		// Object, holds all windows instances
		windows: {},
		// object, with methods, fow wins opening
		winRunners: {},
		addDiv: function(op) {
			var ret = $('<div></div>').attr({
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

			if ($.isFunction(op.beforeOpen) && op.beforeOpen(wid, win) === false) {
				return false;
			}

			// check, if taskbar was set
			if( wmanager.globals.taskbar !== false) {

				// Заголовок для окна
				var _title = op.rawTitle;
				if (_title.length > 18) {
					_title = _title.substr(0, 17);
				}

				var _el = $('<li class="wm_coll" id="wm_coll_'+ wid +'"><a href="#">'+ _title +'</a></li>')
				.attr('wm_action', op.winCode)
				.data('wm_createParams', op.createParams)
				.data('wm_wid', op.wid)
				.click( function() {
					if( !empty(op.openFunc && $.isFunction(op.openFunc)) ) {
						op.openFunc();
					} else {
						wmanager.open(options);
					}
				});
				wmanager.globals.taskbar.append(_el);
			}

			var win = $('#'+ wid);
			/**
			 * Window instance, with basic methods
			 */
			var ret = {
				wid: wid,
				win: win,
				hide: function() {
					wmanager.hide(this.wid);
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
				showMsg: function(text, timer, css_class) {
					wmanager.showMsg(this.wid, text, timer, css_class);
				},
				hideMsgs: function() {
					wmanager.hideMsgs(this.wid);
				},
				loading: function() {
					wmanager.loading(this.wid);
				},
				stopLoading: function() {
					wmanager.stopLoading(this.wid);
				},
				addButton: function(button) {
					wmanager.addButton(this.wid, button);
				},
				removeButton: function(button_id) {
					wmanager.removeButton(this.wid, button_id);
				},
				refresh: function() {
					wmanager.refresh(this.wid);
				}
			};

			//опции сохраняем в глобальный массив для доступа и изменения извне
			wmanager.wins_op[wid] = op;
			// array of window instatnces
			wmanager.windows[wid] = ret;

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
					if($.isFunction(op.resize)) {
						op.resize(e, ui);
					}
				},
				resizeStop: function(e, ui) {
					if($.isFunction(op.resizeStop)) {
						op.resizeStop(e, ui);
					}

					if($.isFunction(wmanager.globals.stateChanged)) {
						wmanager.globals.stateChanged();
					}

					wmanager.stateChanged();
				},
				resizeStart: function(e, ui) {
					if($.isFunction(op.resizeStart)) {
						op.resizeStart(e, ui);
					}
				},
				drag: function() {
					if($.isFunction(op.drag)) {
						op.drag(e, ui);
					}
				},
				dragStop: function() {
					if($.isFunction(op.dragStop)) {
						op.dragStop(e, ui);
					}

					if($.isFunction(wmanager.globals.stateChanged)) {
						wmanager.globals.stateChanged();
					}

					wmanager.stateChanged();
				},
				dragStart: function() {
					if($.isFunction(op.dragStart)) {
						op.dragStart(e, ui);
						wmanager.globals.stateChanged();
					}
				},
				open: function() {

					var winButtons = [];
					if (op.buttMinimize === true) {
						winButtons.push({
							icon: 'minusthick',
							title: wmanager.l('hide_button_label'),
							click: function() {
								wmanager.hide(wid);
							}
						});
					}
					if (op.buttRefresh=== true) {
						winButtons.push({
							icon: 'refresh',
							title: 'refresh',
							click: function(wid) {
								wmanager.refresh(wid);
							}
						});

					}

					if(!$.isArray(op.controlButton)) {
						op.controlButton = [op.controlButton];
					}
					$.each(op.controlButton, function(k, v) {
						winButtons.push(v);
					});
					wmanager.addButton(wid, winButtons);

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

					wmanager.render(op);

					if($.isFunction(wmanager.globals.stateChanged)) {
						wmanager.globals.stateChanged();
					}

					wmanager.stateChanged();
				},
				focus: function() {
					wmanager.focus(wid);
				},
				close: function() {
					wmanager.close(wid);
				},
				beforeclose: function(event) {
					if ($('#wm_confirm_'+ op.wid).length != 0 ) {
						$('#wm_confirm_'+ op.wid).remove();
					}

					if( op.confirmClose === true) {
						var msg = $('<div><div>'+ wmanager.l('close_confirm') + '</div></div>');
						var ok = $('<input type="button" value="'+ wmanager.l('close_confirm_ok') +'" />')
						.click( function() {
							wmanager.close(wid);
							$('#wm_confirm_'+ op.wid).remove();
						});
						var cancel = $('<input type="button" value="'+ wmanager.l('close_confirm_cancel') +'" />')
						.click( function() {
							$('#wm_confirm_'+ op.wid).remove();
						});
						msg.append(ok).append(cancel);

						var win = $('.'+ op.wid);
						var zIndex = win.css('zIndex') + 1;

						$('<div style="z-index: ' + zIndex  + '" class="wmanager_tooltip" id="wm_confirm_'+ op.wid +'"></div>')
						.html(msg).appendTo(wmanager.globals.winsHolder).position({
							my: 'left top',
							at: 'right top',
							of: win,
							offset: '-40 30'
						});

						return false;
					}

					op.beforeclose(event);
				}
			});

			return ret;
		},
		loadAjax: function(url, op) {
			if( !isset(op) ) {
				op = {};
			}
			if( !isset(op.ajaxOptions) ) {
				op.ajaxOptions = {};
			}

			op.ajaxOptions.url = url;
			op.ajaxOptions.dataType = 'html';

			return wmanager.open(op);
		},
		loadJSON: function(url, op) {
			if( !isset(op) ) {
				op = {};
			}
			if( !isset(op.ajaxOptions) ) {
				op.ajaxOptions = {};
			}

			op.ajaxOptions.url = url;
			op.ajaxOptions.dataType = 'json';

			return wmanager.open(op);
		},
		render: function(op) {
			var winobj = wmanager.getWin(op.wid);
			var op = wmanager.getOp(op.wid);

			if ( isset(op.ajaxOptions) && isset(op.ajaxOptions.url) && !empty(op.ajaxOptions.url) ) {
				if($.isFunction(op.beforeAjax) && op.beforeAjax(winobj) === false) {
					return false;
				}

				// Индикатор загрузки
				wmanager.loading(op.wid);

				$.ajax($.extend(op.ajaxOptions, {
					success: function(data) {
						if ((typeof(data) != 'undefined') && (data != null)) {
							if ($.isFunction(op.open)) {
								op.open(data, winobj.wid, winobj.win);
							}
						}
						wmanager.stopLoading(op.wid);
					},
					error: function() {
						wmanager.stopLoading(op.wid);
					}
				}));
			} else {
				if ($.isFunction(op.open)) {
					op.open(op.wid, winobj.win);
				}
			}
		},
		loading: function(wid) {
			var winobj = wmanager.getWin(wid);
			winobj.win.parent().find('.wmanager_icon').attr('src', wmanager.globals.iconsPath +'loading.gif');
		},
		stopLoading: function(wid) {
			var winobj = wmanager.getWin(wid);
			var op = wmanager.getOp(wid);

			winobj.win.parent().find('.wmanager_icon').attr('src', wmanager.globals.iconsPath + op.iconName);
		},
		focus: function(wid) {
			var winobj = wmanager.getWin(wid);
			var op = wmanager.getOp(wid);

			// focus callback
			if($.isFunction(op.focus) && op.focus(winobj) === false) {
				return false;
			}

			var win = winobj.win.parent();

			//winobj.win.dialog('moveToTop').parent().show();

			// Выделяем кнопку активного окна на таскбаре
			$('.wM-collWin').removeClass('wM-collWin-active');
			$('#coll_'+ wid).addClass('wM-collWin-active');
			// Затмнение всех окон, кроме активного
			winobj.win.removeClass('wM-win-active');
			$('.'+ wid).addClass('wM-win-active');

			if($.isFunction(wmanager.globals.stateChanged)) {
				wmanager.globals.stateChanged();
			}

			wmanager.stateChanged();
		},
		/**
		 * Closes window
		 * @param {wid} Windows id
		 * @return boolean
		 */
		close: function(wid) {
			var winobj = wmanager.getWin(wid);
			var op = wmanager.getOp(wid);

			// close callback
			if($.isFunction(op.close) && op.close(winobj) === false) {
				return false;
			}

			winobj.win.parent().hide();
			
			if($.isFunction(wmanager.globals.stateChanged)) {
				wmanager.globals.stateChanged();
			}

			wmanager.stateChanged();
		},
		destroy: function(wid) {
			var winobj = wmanager.getWin(wid);
			var op = wmanager.getOp(wid);

			// destroy callback
			if($.isFunction(op.destroy) && op.destroy(winobj) === false) {
				return false;
			}
			winobj.win.parent().remove();
			
			if($.isFunction(wmanager.globals.stateChanged)) {
				wmanager.globals.stateChanged();
			}

			wmanager.stateChanged();
		},
		hide: function(wid) {
			var winobj = wmanager.getWin(wid);
			var op = wmanager.getOp(wid);

			// hide callback
			if($.isFunction(op.hide) && op.hide(winobj) === false) {
				return false;
			}
			winobj.win.parent().hide();
			
			if($.isFunction(wmanager.globals.stateChanged)) {
				wmanager.globals.stateChanged();
			}

			wmanager.stateChanged();
		},
		refresh: function(wid) {
			var winobj = wmanager.getWin(wid);
			var op = wmanager.getOp(wid);

			// hide callback
			if($.isFunction(op.refresh) && op.refresh(winobj) === false) {
				return false;
			}

			wmanager.render(op);
		},
		closeAll: function() {
			var wins = $('.wmanager_win');
			$.each(wins, function(k, v) {
				wmanager.close( $(v).attr('wid') );
			});
			
			if($.isFunction(wmanager.globals.stateChanged)) {
				wmanager.globals.stateChanged();
			}

			wmanager.stateChanged();
		},
		/*
		 Пример
		 wmanager.addButton(wid, {
			icon: 'colors',
			title: 'Настройки окна',
		 	click: function() {
				alert();
		 	}
		 });
		 */
		addButton: function(wid, btn) {
			if(!$.isArray(btn)) {
				btn = [btn];
			}

			var addHTML = $('#ui-dialog-title-'+ wid);

			$.each( btn, function(i, v) {

				if( empty(v)) {
					return;
				}
				if ( isset(v) && isset(v.beforeRender) && v.beforeRender() !== true) {
					return;
				}
				//добавим возможность задать id кнопки
				if (!isset(v.id) ) {
					v.id = wmanager.utils.genId('wnd_btn');
				}

				// временно - кол-во кнопок уже созданных
				var num = $('#ui-dialog-title-'+ wid).find('a').length;
				var marg = (num*23 + 23);
				var tit = isset(v.title) ? v.title : '';
				$('<a href="#"></a>')
				.addClass('ui-dialog-titlebar-'+ v.icon +' ui-dialog-titlebar-close ui-corner-all wmanager_title_button wm_title_button_'+ v.icon)
				.attr('title', tit)
				.css('margin-right', marg)
				.html('<span class="ui-icon ui-icon-'+ v.icon +'" id="'+v.id+'" />')
				.click( function() {
					v.click(wid);
				})
				.mouseover( function() {
					$(this).addClass('ui-state-hover');
					return false;
				}).mouseout( function() {
					$(this).removeClass('ui-state-hover');
				}).appendTo(addHTML);
			});
		},
		removeButton: function(wid, id) {
			var winobj = wmanager.getWin(wid);
			winobj.win.parent().find('.wm_title_button_'+ id).remove();
		},
		showError: function(wid, msg, timer) {
			wmanager.showMsg(wid, msg, timer, 'ui-state-error wmanager_error');
		},
		hideErrors: function(id) {
			$('.'+ id).find('.wmanager_error').remove();
		},
		showMsg: function(wid, msg, timer, css_class) {
			var winobj = wmanager.getWin(wid);
			var win = winobj.win;
			//var op = wmanager.getOp(wid);

			var msgs = [], ret;
			if( !$.isArray(msg) ) {
				msgs.push(msg);
			} else {
				msgs = msg;
			}

			css_class = empty(css_class) ? 'ui-state-highlight' : css_class;
			timer = !isset(timer) ? 5000 : timer;
			var num = win.find('.wmanager_info').length;

			$.each(msgs, function(k, v) {
				ret = $('<div class="wmanager_info '+ css_class +'"></div>')
				.css('top', num*20)
				.html(v)
				.prependTo(win);
			});
			// какогото х@я ширина на 10 пкс больше. Обрезаем.
			ret.width(win.width() - 10)
			.click( function() {
				$(this).remove();
			});
			// Hide on timer
			if( timer !== false ) {
				setTimeout( function() {
					ret.remove();
					//wmanager.hideMsgs(wid);
				}, timer);
			}

			ret.fadeIn(300);
			return ret;

		},
		hideMsgs: function(wid, doRemove) {
			var winobj = wmanager.getWin(wid);
			winobj.win.find('.wmanager_info').remove();
		},
		blink: function(wid) {
			var winobj = wmanager.getWin(wid);
			winobj.win.effect('pulsate', {
				times: 50
			}, 1000);
		},
		stopBlink: function(wid) {
			var winobj = wmanager.getWin(wid);
			winobj.win.stop();
		},
		extend_op: function(wid, op) {
			wmanager.wins_op[wid] = op;
		},
		/*resizeHeight: function(wid, h) {
		$('.'+ wid).css('height', h);
		},
		resizeWidth: function(wid, w) {
		$('.'+ wid).css('width', w);
		},*/
		/**
		 * Method, for checking new window position. If, window already exists, on given position  - it generates new coords
		 * @param {object} Windows properties
		 * @return boolean
		 */
		checkPos: function(op) {
			op.left = parseInt(op.left, 10);
			op.top = parseInt(op.top, 10);

			if( isset( wmanager.winArrByLeft[op.left +'_'+ op.top]) ) {
				op.left += 25;
				op.top += 25;
				// Проверяем новые значения
				return wmanager.checkPos(op);
			} else {
				wmanager.winArrByLeft[op.left +'_'+ op.top] = op.wid;
				return [op.left, op.top];
			}
		},
		/**
		 * Method, for getting window object
		 * @param {wid} Window id
		 * @return object
		 */
		getWin: function(wid) {
			if(wmanager.windowExists(wid)) {
				return wmanager.windows[wid];
			} else {
				return false;
			}
		},
		/**
		 * Method, for getting window options
		 * @param {wid} Window id
		 * @return object
		 */
		getOp: function(wid) {
			if(wmanager.windowExists(wid)) {
				return wmanager.wins_op[wid];
			} else {
				return false;
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
		l: function(s) {
			var lang = wmanager.lang[wmanager.globals.lang];
			if( isset(lang[s]) ) {
				return lang[s];
			} else {
				return s;
			}
		},
		lang: {
			en: {
				'close_confirm': 'Are you sure?',
				'close_confirm_ok': 'Close',
				'close_confirm_cancel': 'Cancel',
				'hide_button_label': 'Hide'
			}
		},
		regWin: function(winCode, openFunc) {
			wmanager.winRunners[winCode] = openFunc;
		},
		unregWin: function(winCode, openFunc) {
			delete wmanager.winRunners[winCode];
		},
		stateChanged: function() {
			fbug('state changed');
			wmanager.serialize();
		},
		serialize: function() {

			// Сейвим, только если чтото изменилось
			//if( wmanager.interfaceChanged !== true ) return false;

			var wins = wmanager.windows;
			var ret = {
				wins: [],
				res: []
			};
			var err = false;
			fbug(wins)
			if (wins.length !== 0) {

				var z = [], ar = {};
				$.each(wins, function(k, v) {
					v = $(v.win.parent());
					if( empty(v)) {
						return;
					}
					var pos = v.offset();
					var left = pos.left;
					var top = pos.top;

					// фикс для тупого хрома
					if( left < 0 ) {
						fbug('chrome fuck error')
						err = true;
						return;
					}

					if (!empty(v.data('winCode'))) {

						var zIn = parseInt(v.css('zIndex'), 10);
						// Массив с зИндексами, по-которому будем сортировать
						z.push(zIn);
						// Вспомогательный массив с ключами - зИндексами
						ar[zIn] = {
							//'i': v.attr('id'),
							'w': parseInt(v.width(), 10),
							'h': parseInt(v.height(), 10),
							'l': parseInt( pos.left, 10),
							't': parseInt( pos.top, 10),
							'c': v.data('winCode'),
							//'cl': v.attr('winClass'),
							'p': v.data('createParams'),
							//'color': v.data('colorPreset'),
							//'font': v.data('fontPreset'),
							'z': parseInt(v.css('zIndex'), 10),
							'wid': v.data('wid')
						};
					}
				});
				// Сортируем по зИндексу
				z = z.sort( function (a,b) {
					return a-b;
				});
				$.each(z, function(k, v) {
					ret.wins.push( ar[v] );
				});
			}

			// ресайзер
			ret.res = $('.ui-layout-resizer').css('right');
			ret.east_state = $('.ui-layout-east').css('display');
			ret.east_width = $('.ui-layout-east').width();

			// Разрешение экрана
			ret.screen = {
				width: screen.width,
				height: screen.height
			};

			if( err == true ) {
				ret = false;
			}

			// сериалайз делать не нужно, если не изменен интерфес
			//wmanager.interfaceChanged = false;
			fbug('saving state')
			wmanager.globals.sessionWriter(ret);
			//return ret;
		},
		restore: function() {

			try {
				var ar = wmanager.globals.sessionReader();

				if ( !empty(ar) && isset(ar.wins) ) {
					// коэффициэнт завист от разрешения экрана
					var screen_coef_left = 1;
					var screen_coef_top = 1;

					if (typeof(ar.screen) != 'undefined') {
						screen_coef_left = screen.width / ar.screen.width;
						screen_coef_top = screen.height / ar.screen.height;

						if(screen_coef_left > 1 || screen_coef_top > 1) {
							screen_coef_left = 1;
							screen_coef_top = 1;
						}
					}

					var zin = 1500;

					$.each(ar.wins, function(k, v) {
						zin++;

						if (!empty(v)) {

							// Расшифровываем массив
							var d = {
								//id: v.i,
								width: v.w/* * screen_coef_left*/,
								height: v.h/* * screen_coef_top*/,
								left: v.l/* * screen_coef_left*/,
								top: v.t/* * screen_coef_top*/,
								winCode: v.c,
								//winClass: v.cl,
								zIndex: zin,
								createParams: v.p,
								wid: v.wid,
								//colorPreset: v.color,
								//fontPreset: v.font
							};

							// Задаем опции для окна
							wmanager.extend_op(d.wid, d);

							setTimeout( function() {
								if(isset(wmanager.winRunners[d.winCode])) {
									var func = wmanager.winRunners[d.winCode];
									
									func();
								}
								//wmanager.open(d.winCode, d.createParams);
							}, 200 + (100 * k));
						}
					});
				}
			} catch(e) {
				fbug('Error while restoring wins');
				fbug(e);
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
			wmanager.open($.extend(this.options, {
				content: this.element
			}));
		}
	});

})(jQuery);