/*jslint browser: true */

/*jslint node: true */

/*global global, ActiveXObject, define, escape, module, pnotify, Proxy, jQuery, require, self, setImmediate, window */

/*!
 * modified tablesort v4.0.1 (2016-03-30)
 * @see {@link http://tristen.ca/tablesort/demo/}
 * @see {@link https://github.com/tristen/tablesort}
 * Copyright (c) 2016 ; Licensed MIT
 * @see {@link https://github.com/tristen/tablesort/blob/gh-pages/src/tablesort.js}
 * passes jshint
 */
(function (root) {
	"use strict";
	function Tablesort(el, options) {
		if (!(this instanceof Tablesort)) {
			return new Tablesort(el, options);
		}
		if (!el || el.tagName !== 'TABLE') {
			throw new Error('Element must be a table');
		}
		this.init(el, options || {});
	}
	var sortOptions = [];
	var createEvent = function (name) {
		var evt;
		if (!root.CustomEvent || typeof root.CustomEvent !== "function") {
			evt = document.createEvent("CustomEvent");
			evt.initCustomEvent(name, false, false, undefined);
		} else {
			evt = new CustomEvent(name);
		}
		return evt;
	};
	var getInnerText = function (el) {
		return el.getAttribute('data-sort') || el.textContent || el.innerText || '';
	};
	var caseInsensitiveSort = function (a, b) {
		a = a.toLowerCase();
		b = b.toLowerCase();
		if (a === b) {
			return 0;
		}
		if (a < b) {
			return 1;
		}
		return -1;
	};
	var stabilize = function (sort, antiStabilize) {
		return function (a, b) {
			var unstableResult = sort(a.td, b.td);
			if (unstableResult === 0) {
				if (antiStabilize) {
					return b.index - a.index;
				}
				return a.index - b.index;
			}
			return unstableResult;
		};
	};
	Tablesort.extend = function (name, pattern, sort) {
		if (typeof pattern !== "function" || typeof sort !== "function") {
			throw new Error('Pattern and sort must be a function');
		}
		sortOptions.push({
			name: name,
			pattern: pattern,
			sort: sort
		});
	};
	Tablesort.prototype = {
		init: function (el, options) {
			var that = this,
			firstRow,
			defaultSort,
			i,
			cell;
			that.table = el;
			that.thead = false;
			that.options = options;
			if (el.rows && el.rows.length > 0) {
				if (el.tHead && el.tHead.rows.length > 0) {
					for (i = 0; i < el.tHead.rows.length; i++) {
						if (el.tHead.rows[i].classList.contains("sort-row")) {
							firstRow = el.tHead.rows[i];
							break;
						}
					}
					if (!firstRow) {
						firstRow = el.tHead.rows[el.tHead.rows.length - 1];
					}
					that.thead = true;
				} else {
					firstRow = el.rows[0];
				}
			}
			if (!firstRow) {
				return;
			}
			var onClick = function () {
				if (that.current && that.current !== this) {
					that.current.classList.remove('sort-up');
					that.current.classList.remove('sort-down');
				}
				that.current = this;
				that.sortTable(this);
			};
			for (i = 0; i < firstRow.cells.length; i++) {
				cell = firstRow.cells[i];
				if (!cell.classList.contains('no-sort')) {
					cell.classList.add('sort-header');
					cell.tabindex = 0;
					cell.addEventListener('click', onClick, false);
					if (cell.classList.contains('sort-default')) {
						defaultSort = cell;
					}
				}
			}
			if (defaultSort) {
				that.current = defaultSort;
				that.sortTable(defaultSort);
			}
		},
		sortTable: function (header, update) {
			var that = this,
			column = header.cellIndex,
			sortFunction = caseInsensitiveSort,
			item = '',
			items = [],
			i = that.thead ? 0 : 1,
			sortDir,
			sortMethod = header.getAttribute('data-sort-method'),
			sortOrder = header.getAttribute('data-sort-order');
			that.table.dispatchEvent(createEvent('beforeSort'));
			if (update) {
				sortDir = header.classList.contains('sort-up') ? 'sort-up' : 'sort-down';
			} else {
				if (header.classList.contains('sort-up')) {
					sortDir = 'sort-down';
				} else if (header.classList.contains('sort-down')) {
					sortDir = 'sort-up';
				} else if (sortOrder === 'asc') {
					sortDir = 'sort-down';
				} else if (sortOrder === 'desc') {
					sortDir = 'sort-up';
				} else {
					sortDir = that.options.descending ? 'sort-up' : 'sort-down';
				}
				header.classList.remove(sortDir === 'sort-down' ? 'sort-up' : 'sort-down');
				header.classList.add(sortDir);
			}
			if (that.table.rows.length < 2) {
				return;
			}
			if (!sortMethod) {
				while (items.length < 3 && i < that.table.tBodies[0].rows.length) {
					item = getInnerText(that.table.tBodies[0].rows[i].cells[column]);
					item = item.trim();
					if (item.length > 0) {
						items.push(item);
					}
					i++;
				}
				if (!items) {
					return;
				}
			}
			for (i = 0; i < sortOptions.length; i++) {
				item = sortOptions[i];
				if (sortMethod) {
					if (item.name === sortMethod) {
						sortFunction = item.sort;
						break;
					}
				} else if (items.every(item.pattern)) {
					sortFunction = item.sort;
					break;
				}
			}
			that.col = column;
			for (i = 0; i < that.table.tBodies.length; i++) {
				var newRows = [],
				noSorts = {},
				j,
				totalRows = 0,
				noSortsSoFar = 0;
				if (that.table.tBodies[i].rows.length < 2) {
					continue;
				}
				for (j = 0; j < that.table.tBodies[i].rows.length; j++) {
					item = that.table.tBodies[i].rows[j];
					if (item.classList.contains('no-sort')) {
						noSorts[totalRows] = item;
					} else {
						newRows.push({
							tr: item,
							td: getInnerText(item.cells[that.col]),
							index: totalRows
						});
					}
					totalRows++;
				}
				if (sortDir === 'sort-down') {
					newRows.sort(stabilize(sortFunction, true));
					newRows.reverse();
				} else {
					newRows.sort(stabilize(sortFunction, false));
				}
				for (j = 0; j < totalRows; j++) {
					if (noSorts[j]) {
						item = noSorts[j];
						noSortsSoFar++;
					} else {
						item = newRows[j - noSortsSoFar].tr;
					}
					that.table.tBodies[i].appendChild(item);
				}
			}
			that.table.dispatchEvent(createEvent('afterSort'));
		},
		refresh: function () {
			if (this.current !== undefined) {
				this.sortTable(this.current, true);
			}
		}
	};
	if (typeof module !== "undefined" && module.exports) {
		module.exports = Tablesort;
	} else {
		root.Tablesort = Tablesort;
	}
})("undefined" !== typeof window ? window : this);