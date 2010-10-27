(function($){
	//$.wManager = {};
	$.wManager = {
		/** 
		* Global vars, applied to all windows, can be extended by method $.wManager.setGlobal()
		*/
		globals: {
			// Container for windows
			winsHolder: 'body',
			// Method called, when interface is changed, may be used for saving layout state 
			save: function() {},
			iconsPath: 'icons/'
			//taskbar: '#taskbar'
		},
		// Setting global vars
		set_global: function(k, v) {
			if( typeof(k) == 'object' ) {
				$.each(k, function(key, val) {
					$.wManager.globals[key] = val;
				});
			}
			else {
				$.wManager.globals[k] = v;
			}
			
		},
		/** 
		* Vars, applied to current window
		*/
		defaults: {
			// Positioning 
			left: false,
			top: false,
			zIndex: 1005,

			//Width of window
			width: 'auto',
			height: 'auto',
			minWidth: 200,
			minHeight: 200,
			
			title: 'Win',
			content: '',
			modal: false,
			// default icon
			icon: 'application.png',
			group: false,
			content_id: '',
			buttMinimize: false,
			buttSettings: false,
			controlButton: [],
			settingsClick: function() {},
			ajaxDataType: 'html',
			ajaxLoaded: function() {},
			resizable: true,
			draggable: true,
			confirmClose: true,
			
			confirmCloseMsg: 'Are you sure?',
			confirmCloseOk: 'yes',
			confirmCloseCancel: 'cancel',
			
			winCode: '',
			createParams: '',
			/* Events */
			beforeclose: function() {},
			close: function() {},
			resize: function(){},
			resizeStop: function(){},
			minimize: function() {},
			dragStop: function() {},
			dragStart: function() {},
			stateChanged: function(){
				$.wManager.globals.save()
			}
			
		},
		winArrByLeft: [],
		// Object, holds all options for windows
		wins_op: {},
		windows: {},
		// Новое окно открывается на основе существующего дива
		// Создаем див - основу окна
		addDiv: function(op) {
			var ret = $('<div />').attr({'id': op.wid, 'title': op.title}).append(op.content).appendTo($.wManager.globals.winsHolder);	
			return ret;
		},
		// Сворачивание и разворачивание окон
		useWin: function(wid) {
			$('.' + wid).css('display', 'block');
			$('#' + wid).dialog('moveToTop');
		},
		openWin: function(options) {
			var wid = typeof(options.id) == 'undefined' ? genId('wManager_win') : 'wManager_win_' + options.id;
			if ( !empty(options.content_id) ) {
				wid = options.content_id;
			}
			
			// Если окно с таким айди уже есть - переводим на него фокус или разворачиваем
			if( $('.'+wid).length == 1 ) {
				$.wManager.useWin(wid);
				return;
			}
			
			// ор - конфиг, для создания нового окна
			var op = {};
			op = $.extend(op, $.wManager.defaults, options, {wid: wid});

			if( isset($.wManager.wins_op[wid]) ) {
				$.extend(op, $.wManager.wins_op[wid]);
			}

			// Заголовок окна
			op.rawTitle = op.title;
			op.title = '<img src="'+ $.wManager.globals.iconsPath + op.icon +'" align="left" class="wM-icon" id="wM-icon_'+wid+'" />'+ 
						'<span class="'+ wid +'_title">'+ op.title +'</span>';
			
			// 
			op.minHeight = isset(op.minHeight) ? op.minHeight : op.height;
			op.minWidth = isset(op.minWidth) ? op.minWidth : op.width;
			
			// Удалять ли див при закрытии окна ()
			var undeleteable = !empty(op.content_id) ? ' undeleteable' : '';
			
			// Создание диалога на основе существующего ДОМ-элемента или создаем его вручную
			if (empty(op.content_id)) {
				var newd = $.wManager.addDiv(op);
			}
			
			// Если окно должно быть в меню - создаем нужный пункт
			if( op.group !== false && $('#coll_'+ wid).length === 0) {
				if( !isset(op.group)) {
					op.group = [];
				}
				
				// Заголовок для окна
				var _title = op.rawTitle;
				if (_title.length > 18) {
					_title = _title.substr(0, 17);
				} 
				
				$('.submenu li a[action='+ op.group +']').parent('li')
					.after('<li id="coll_'+ wid +'"><a href="#" action="'+ op.winCode +'" createParams="'+ op.createParams +'">&nbsp;&nbsp;&nbsp;&nbsp;'+ _title +'</a></li>');
				
				init.menu();
				$.wManager.windows[op.group].push(wid);
			}
			
			// Проверка позиции окна
			var pos = $.wManager.checkPos(op);
			// Создаем сам диалог!
			$('#'+wid).dialog({
					bgiframe: true,
					autoOpen: true,
					height: op.height,
					width: op.width,
					minWidth: op.minWidth,
					minHeight: op.minHeight,
					closeOnEscape: true,
					dialogClass: wid + ' wM-win wM-win-active' + undeleteable,
					position: pos,
					modal: op.modal,
					title: op.title,
					zIndex: op.zIndex,
					resizable: op.resizable,
					draggable: op.draggable,
					resizeStop: function(e, ui){
						op.resizeStop(e, ui);
						op.stateChanged();
					},/*
					resize: function(e, ui){
						op.resize(e, ui);
					},
					resizeStart: function(e, ui){
						op.resizeStart(e, ui);
					}, */
					dragStop: function(){
						op.dragStop();
						op.stateChanged();
					},
					dragStart: function(){
						op.dragStart();
					},
					open: function() {
						
						var winButtons = [];
						if (op.buttMinimize === true) {
							winButtons.push({
								icon: 'minus',
								title: 'Свернуть',
								func: function() {
									op.minimize();
									$.wManager.minimize(wid);
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
						
						$.wManager.addButton(winButtons, wid);
						
						var win = $('.'+ wid);
						win.attr('icon', op.icon);
						win.data('createParams', op.createParams);
						win.attr({winCode: op.winCode, createParams: op.createParams, wid: wid});
						win.draggable('option', 'containment', '#content_area');
					},
					focus: function() {
						// Выделяем кнопку активного окна на таскбаре
						$('.wM-collWin').removeClass('wM-collWin-active');
						$('#coll_'+wid).addClass('wM-collWin-active');
						
						// Затмнение всех окон, кроме активного
						$('.wM-win').removeClass('wM-win-active');
						$('.'+wid).addClass('wM-win-active');
						
						op.stateChanged();							
					},
					close: function(event) {
						op.stateChanged();
						op.close(event);
						$.wManager.close(wid);
					},
					beforeclose: function(event) {
						if ($('#wm_confirm_'+ op.wid).length != 0 ) {
							$('#wm_confirm_'+ op.wid).remove();
						}
						
						if( op.confirmClose === true) {
							var msg = $('<div>'+ op.confirmCloseMsg + '</div>');
							var ok = $('<input type="button" value="'+ op.confirmCloseOk + '" />')
								.click( function() { $.wManager.close(wid); $('#wm_confirm_'+ op.wid).remove(); });
							var cancel = $('<input type="button" value="'+ op.confirmCloseCancel + '" />')
								.click( function() { $('#wm_confirm_'+ op.wid).remove(); });
							msg = msg.add(ok).add(cancel);
							
							var zIndex = +win.css('zIndex') + 1;							
							var pos = $('.'+ op.wid).offset();
							var top = parseInt( pos.top, 10) + 22;
							var left = parseInt( pos.left, 10) + $('.'+ op.wid).width() - 50;
							$('<div style="top:'+ top +'px; left:'+ left +'px; width: 110px; z-index: ' + zIndex  + '" class="wm_tooltip" id="wm_confirm_'+ op.wid +'"></div>')
								.html(msg).appendTo($.wManager.globals.winsHolder);
							
							return false;
						}
						
						op.beforeclose(event);
					}
				});
				var win = $('#'+ wid);
				// 
				if ( isset(op.ajaxURL) && !empty(op.ajaxURL) ) {
					
					$.ajax({
						cache: false,
						async: true,
						url: op.ajaxURL,
						dataType: op.ajaxDataType,
						'data': op.ajaxData,
						type: 'GET',
						success: function(data){						
							if ($.isFunction(op.ajaxLoaded)) {
								op.ajaxLoaded(data, wid, win);
							}
						}
					});
				}
				
				if ( $.isFunction(op.open) )
					op.open(wid, win);
				
				return op;
		},
		loadAjax: function(url, op) {
			if( typeof(op) == 'undefined' )
				op = {};
			
			op.ajaxURL = url;
			$.wManager.openWin(op);
			
		},
		loadJSON: function(url, op) {
			if( typeof(op) == 'undefined' )
				op = {};
			
			op.ajaxURL = url;
			op.ajaxDataType = 'json';
			$.wManager.openWin(op);
			
		},
		loading: function(wid) {
			$('.'+ wid).find('.wM-icon').attr('src', TRDatahost.images +'/loadinfo.net.gif');
		},
		stopLoading: function(wid) {
			var icon = $('.'+ wid).attr('icon');
			$('.'+ wid).find('.wM-icon').attr('src', TRDatahost.images +'/icons/'+ icon);
		},
		setTitle: function(wid, v, both) {
			$('#ui-dialog-title-'+ wid +' .'+ wid +'_title').html(v);
			
			if(both === true) {
				$('.'+ wid +'_title').html(v);
			}
		},
		getPos: function(wid) {
			var win = $('.'+ wid);
			
			return {
				left: win.css('left'),
				top: win.css('top'),
				width: win.width(),
				height: win.height(),
				zIndex: win.css('zIndex')
			};
		},
		setPos: function(wid, pos){
			$('.'+ wid).css(pos);
			return true;
		},
		addButton: function(btn, wid) {
			var addHTML = $('#ui-dialog-title-'+ wid);
			$.each( btn, function(i, v) {
				
				if( v == null ) {
					return;
				}
				if ( isset(v) && isset(v.beforeRender) && v.beforeRender() !== true) {
					return;
				}
				
				var tit = isset(v.title) ? v.title : '';
				$('<a href="#" role="button" class="ui-dialog-titlebar-'+ v.icon +'" title="'+ tit +'" style="float:right;margin-right:'+ (i*20 + 20) +'px;"></a>')
					.html('<span class="ui-icon ui-icon-'+ v.icon +'" />')
					.click(v.func).mouseover(function(){
						$(this).addClass('ui-state-hover');
					}).mouseout(function(){
						$(this).removeClass('ui-state-hover');
					}).appendTo(addHTML);
			});
		},
		resizeHeight: function(wid, h) {
			$('.'+ wid).css('height', h);
		},
		resizeWidth: function(wid, w) {
			$('.'+ wid).css('width', w);
		},
		checkPos: function(op) {
			op.left = parseInt(op.left, 10);
			op.top = parseInt(op.top, 10);
			
			if( isset( $.wManager.winArrByLeft[op.left]) ) {
				op.left += 25;
				op.top += 25;
				// Проверяем новые значения
				return $.wManager.checkPos(l, t);
			}
			else {
				return [op.left, op.top];
			}
		},
		getNewPos: function(w, h) {
			var ret = [];
			
			l = Math.floor( ( $(document).width() - w ) / 2 );
			t = Math.floor( ( $(document).height() - h ) / 2 );
			
			// Проверка, есть ли окно с таким-же позиционированием
			ret = $.wManager.checkPos(l, t);
			
			$.wManager.winArrByLeft[ret[0]] = true;
			
			return ret;
		},
		close: function(wid) {
			if( $('.'+ wid).hasClass('undeleteable')) {
				$('.'+ wid).hide();
			}
			else {
				$('#'+wid).remove();
				$('.'+wid).remove();
			}
			
			$.wManager.defaults.stateChanged();
		},
		minimize: function(wid) {
			$('.'+ wid).find('#'+ wid).toggle();
		},
		closeAll: function() {
			var wins = $('.wM-win');
			$.each(wins, function(k, v) {
				$.wManager.close( $(v).attr('wid') );
			});
		},
		extend_op: function(wid, opts) {
			$.wManager.wins_op[wid] = opts;
		},
		serialize: function() {
			var wins = $('.wM-win:visible');
			var ret = {
				wins: [],
				res: []
			};
		
			if (wins.length == 0) {
				return {};
			}
			
			var z = [], ar = {};
			$.each(wins, function(k, v) {
				v = $(v);
				if( empty(v)) {
					return;
				}
				
				if (!empty(v.attr('winCode'))) {
					
					var zIn = parseInt(v.css('zIndex'), 10);
					// Маассив с зИндексами, по-которому будем сортировать
					z.push(zIn);
					// Вспомогательный массив с ключами - зИндексами
					ar[zIn] = {
						'i': v.attr('id'),
						'w': parseInt(v.width(), 10),
						'h': parseInt(v.height(), 10),
						'l': parseInt(v.css('left'), 10),
						't': parseInt(v.css('top'), 10),
						'c': v.attr('winCode'),
						'p': v.data('createParams'),
						'z': parseInt(v.css('zIndex'), 10),
						'wid': v.attr('wid')
					};
					
					
				}
			});

			// Сортируем по зИндексу
			z = z.sort(function (a,b){return a-b;});
			
			$.each(z, function(k, v) {
				ret.wins.push( ar[v] );
			});
			
			// ресайзер
			ret.res = $('.ui-layout-resizer').css('right');
//fbug('save')
//fbug(ret.wins)
			return ret;
		},
		restore: function(ar, callback) {
//fbug('restore')
//fbug(ar)
			try {
				if ( !empty(ar) && trdata.utils.is_array(ar) && isset(ar.wins) )
				{
					$.each(ar.wins, function(k, v) {
						if (!empty(v)) {
						
							// Расшифровываем массив
							var d = {
								id: v.i,
								width: v.w,
								height: v.h,
								left: v.l,
								top: v.t,
								winCode: v.c,
								zIndex: v.z,
								createParams: v.p,
								wid: v.wid
							};
							
							// Задаем опции для окна
							$.wManager.extend_op(d.wid, d);
							setTimeout(function(){
								trdata.manage_wins(d.winCode, d.createParams);
							}, 200 + (100 * k));
						}
						
					});
					
					trdata.layout.sizePane('east', parseInt(ar.res, 10));
		
					//$('.ui-layout-resizer').css('right', ar.res);
				}	
				
				//if ($.isFunction(callback)) callback();			
				
			} catch(e) {
				fbug("ERROR");
				fbug(e);
			} finally {
				if ($.isFunction(callback)) callback();	
			}
		}
};
})(jQuery);



















/* PHPJS functions */
function empty (mixed_var) {
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
    ){
        return true;
    }

    if (typeof mixed_var == 'object') {
        for (key in mixed_var) {
            return false;
        }
        return true;
    }

    return false;
}
function isset () {
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
}

function fbug(s) {
	console.log(s);
}



