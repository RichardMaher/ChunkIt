function Predictor (
		targetElement,
		frameClass,
		divClass,
		selClass,
		dataFetch,
		singleton,
		lovOptions)
{
	if (arguments.length < 6)
		throw new Error("Insufficient arguments for Predictor");

	var RMARGIN = getScrollbarWidth();

	var lovTarget = targetElement;
	var targetStyle = getComputedStyle(lovTarget);

	if (!lovTarget.id)
		throw new Error('"id" attribute must be defined for element');

	if (typeof dataFetch != "function" || typeof singleton != "function")
		throw new Error('Both "callback" parameters must be of type "function"');

	if (PredictorList.LOV[lovTarget.id])
		throw new Error("A list of values is already defined for this element");

	var CARRIAGE_RETURN
		= 13;
	var resObj = null;
	var lovDetent = 300;
	var lovMax = 10;
	var fixedWidth = false;
	var scrollBars = false;

	var stagger = null;
	var resetCriteria = null;
	var currVintage = 0;
	var lastSearch = "";
	var lastSelected = -1;
	var dataFetch = dataFetch;
	var singleton = singleton;
	var selClass = selClass || "";
	var offsetTop = 0;
	var offsetLeft = 0;
	var isCancellable = true;
	var lastLOV = null;

	var containerDiv = document.createElement("div");
	if (frameClass != null)
		containerDiv.className = frameClass;
	containerDiv.style.visibility = "hidden";
	containerDiv.style.position = "absolute";
	containerDiv.style.height = "auto";
	containerDiv.style.overflowY = "hidden";
	containerDiv.style.overflowX = "hidden";
	containerDiv.style.padding = "0px";
	containerDiv.style.margin = "0px";

	var targetDiv = document.createElement("div");
	targetDiv.tabIndex = "-1";
	targetDiv.className = divClass || lovTarget.className;
	targetDiv.style.whiteSpace = "nowrap";
	targetDiv.style.overflowY = "auto";
	targetDiv.style.overflowX = "auto";
	targetDiv.style.paddingLeft = targetStyle.paddingLeft;

	var suggestList = document.createElement("ul");

	var localCSS = getCSS();
	localCSS.insertRule("." + targetDiv.className + " ul {display: inline-block}", 0);
	localCSS.insertRule("." + targetDiv.className + ":focus {outline: none;}", 1);

	var setOptions =
		function (suggestOptions) {
			if (suggestOptions.keyDetent != undefined &&
				typeof suggestOptions.keyDetent == "number")
				lovDetent = suggestOptions.keyDetent;

			if (suggestOptions.maxRows != undefined &&
				typeof suggestOptions.maxRows == "number")
				lovMax = suggestOptions.maxRows;

			if (suggestOptions.fixedWidth != undefined &&
				typeof suggestOptions.fixedWidth == "boolean") {
				fixedWidth = suggestOptions.fixedWidth;
				if (fixedWidth) {
					containerDiv.style.width = targetElement.offsetWidth + "px";
					targetDiv.style.width = (containerDiv.clientWidth -
						Number(targetStyle.paddingLeft.match("[0-9.]*"))) + "px";
				} else {
					containerDiv.style.width = "";
					targetDiv.style.width = "";
				}
				if (containerDiv.style.visibility == "visible") posLOV();
			}

			if (suggestOptions.scrollBars != undefined &&
				typeof suggestOptions.scrollBars == "boolean") {
				targetDiv.style.paddingRight = RMARGIN + "px";
				scrollBars = suggestOptions.scrollBars;
				if (scrollBars) {
					targetDiv.style.paddingBottom = "";
				} else {
					targetDiv.style.paddingBottom = RMARGIN + "px";
				}
			}

			if (suggestOptions.cancellable != undefined &&
				typeof suggestOptions.cancellable == "boolean") {
				isCancellable = suggestOptions.cancellable;
			}
		}

	targetDiv.appendChild(suggestList);
	containerDiv.appendChild(targetDiv);
	document.body.appendChild(containerDiv);

	if (lovOptions != undefined) setOptions(lovOptions);

	var divStyle = getComputedStyle(targetDiv);

	var getLOV =
		function (newList) {
			var newList = newList;
			var lovVintage = ++currVintage;
			var abortControl = new AbortController();
			var rowMax = lovMax;
			var isClosed = false;

			containerDiv.style.visibility = "hidden";

			var append = function (rowKey, rowData) {
				if (lovVintage != currVintage || isClosed || typeof rowData != "string") {
					return Promise.resolve(-1);
				}

				var retVal = new Promise(function (entryResolve)
				{
					var entryResolve = entryResolve;

					setTimeout(() =>
						{
							var listItem = document.createElement("li");
							listItem.innerHTML = rowData.replace(/\s+$/, '');
							listItem.dataset.key = rowKey;
							listItem.dataset.posIndex = newList.childElementCount;
							newList.appendChild(listItem);

							if (!fixedWidth) {
								if (targetDiv.clientWidth < targetDiv.scrollWidth)
									targetDiv.style.width = (targetDiv.scrollWidth
										+ (targetDiv.scrollWidth - targetDiv.clientWidth)) + "px";
							}

							if (newList.childElementCount == 1 && containerDiv.style.visibility == "hidden") {
								posLOV();
								containerDiv.style.visibility = "visible";
							}

							if (newList.childElementCount <= rowMax) {
								var viewLimit = (newList.children.length == lovMax) ? lovMax : newList.children.length;
								var targetDivHeight = (newList.children[viewLimit - 1].offsetTop + newList.children[viewLimit - 1].offsetHeight);

								targetDiv.style.height = targetDivHeight + "px";
								containerDiv.style.height = targetDivHeight + "px";
							}

							entryResolve(listItem.dataset.posIndex);
						}, 0);
				})

				return retVal;
			}

			var close = function () {
				if (lovVintage != currVintage || isClosed) {
					return Promise.resolve(-1);
				}

				var retVal = new Promise(function (entryResolve) {
					var entryResolve = entryResolve;

					setTimeout(() => {
						isClosed = true;
						entryResolve(1);
					}, 0);
				})
				return retVal;
			}

			var cancel = function () {
				try {
					abortControl.abort();
					isClosed = true;
				} catch (e) { }
			}

			var getSignal = function() {
				return abortControl.signal;
			}

			if (isCancellable) {
				return {
					append: append,
					close: close,
					cancel: cancel,
					getSignal: getSignal
				};
			} else {
				return {
					append: append,
					close: close
				};
			}
		}

	var clickHandler =
		function (evt) {
			var lclTarget = evt.target || evt.srcElement;

			if (lclTarget.tagName.toLowerCase() == "option")
				lclTarget = lclTarget.parentNode;

			if (lclTarget.tagName.toLowerCase() != "select")
				return;

			if (lclTarget.selectedIndex == lastSelected) {
				lclTarget.selectedIndex = -1;
				lastSelected = -1;
				containerDiv.style.visibility = "hidden";
				return;
			}

			lastSelected = lovTarget.selectedIndex;
			newLOV();
		}

	var keyHandler =
		function () {
			if (falseAlarm())
				return;

			if (stagger)
				clearTimeout(stagger);

			stagger = setTimeout(newKey, lovDetent);
		};

	function posLOV() {
		var dimTarget = lovTarget;
		offsetTop = dimTarget.offsetTop + dimTarget.offsetHeight;
		offsetLeft = dimTarget.offsetLeft;

		while (dimTarget = dimTarget.offsetParent) {
			offsetTop += dimTarget.offsetTop;
			offsetLeft += dimTarget.offsetLeft;
		}

		containerDiv.style.top = offsetTop + "px";
		containerDiv.style.left = (offsetLeft -
			Number(getComputedStyle(containerDiv).borderLeftWidth.match("[0-9.]*"))) + "px";
	}

	function newKey() {
		stagger = null;
		if (falseAlarm())
			return;

		lastSearch = lovTarget.value;

		newLOV();
	}

	function falseAlarm() {
		if (lovTarget.value == lastSearch &&
			containerDiv.style.visibility == "visible")
			return true;

		if (lovTarget.value.length == 0) {
			lastSearch = "";
			if (lastLOV != null) {
				lastLOV.cancel();
			}
			containerDiv.style.visibility = "hidden";
			return true;
		}

		return false;
	}

	function newLOV() {
		if (isCancellable && lastLOV != null) {
			lastLOV.cancel();
		}

		if (!fixedWidth) {
			targetDiv.style.width = "";
		}

		var newList = document.createElement("ul");
		newList.style.padding = "0px";
		newList.style.margin = "0px";
		newList.style.whiteSpace = "nowrap";
		newList.style.display = "table-cell";
		newList.style.listStyleType = "none";

		newList.addEventListener("mouseover", listHandler, false);
		newList.addEventListener("mouseout", listHandler, false);
		newList.addEventListener("click", listHandler, false);

		suggestList.parentNode.replaceChild(newList, suggestList);
		suggestList = newList;

		posLOV();

		var rowCallback = getLOV(newList);
		lastLOV = rowCallback;
		dataFetch.call(resObj, lovTarget, rowCallback);
	};

	var listHandler =
		function (evt) {
			var lclTarget = evt.target || evt.srcElement;

			lclTarget = lclTarget.closest("li");

			if (evt.type == "mouseover") {
				if (selClass != "") {
					lclTarget.className = selClass;
				} else {
					lclTarget.style.color = divStyle.backgroundColor;
					lclTarget.style.backgroundColor = divStyle.color;
				}
			}
			if (evt.type == "mouseout") {
				if (selClass != "") {
					lclTarget.className = "";
				} else {
					lclTarget.style.color = "";
					lclTarget.style.backgroundColor = "";
				}
			}
			if (evt.type == "click") {
				singleton.call(resObj, lovTarget, lclTarget.dataset.key, lclTarget.firstChild.nodeValue, lclTarget.dataset.posIndex, lastLOV);
				if (lovTarget.type.toLowerCase() == "text")
					lovTarget.value = lovTarget.value;
			}
		}

	var shiftFocus =
		function (e) {
			var evt = e || window.event;
			var lclTarget = evt.target || evt.srcElement;
			if (lclTarget.nodeType != 1)
				return;

			if (lclTarget != lovTarget &&
				lclTarget != targetDiv &&
				containerDiv.style.visibility == "visible") {
				hideLOV();
			}
		}

	var hideLOV =
		function () {
			if (containerDiv.style.visibility == "visible") {
				containerDiv.style.visibility = "hidden";
				currVintage++;
				resetCriteria();
			}
		}

	var removeLOV =
		function () {
			currVintage++;

			if (stagger)
				clearTimeout(stagger);

			lovTarget.removeEventListener("keyup", keyHandler);
			lovTarget.removeEventListener("click", clickHandler);

			document.removeEventListener("focus", shiftFocus);
			lovTarget.removeEventListener("focus", resetCursor);
			lovTarget.removeEventListener('keypress', trapCR);

			document.body.removeChild(containerDiv);

			setOptions = null;
			hideLOV = null;
			removeLOV = null;

			PredictorList.LOV[lovTarget.id] = null;
		}

	var resetCursor =
		function (e) {
			if (lovTarget.type.toLowerCase() == "text") {
				lovTarget.valueOf = lovTarget.valueOf;
			}
		}

	var trapCR =
		function (e) {
			var evt = e || window.event;
			var keyCode = evt.keyCode || evt.which;
			if (keyCode == null || keyCode != CARRIAGE_RETURN) return true;

			targetDiv.focus();
		}

	document.addEventListener("focus", shiftFocus, true);
	lovTarget.addEventListener('keypress', trapCR, true);
	lovTarget.addEventListener("focus", resetCursor, true);

	switch (lovTarget.type.toLowerCase()) {
		case "text":
			lovTarget.addEventListener("keyup", keyHandler, false);
			resetCriteria =
				function () {
					lastSearch = "";
				}
			break;
		case "select-one":
			lovTarget.addEventListener("click", clickHandler, false);
			resetCriteria =
				function () {
					lovTarget.selectedIndex = -1;
					lastSelected = -1;
				}
			break;
		default:
			throw new Error("Unsupported field type for LOV");
	}

	PredictorList.LOV[lovTarget.id] = this;

	resObj = {
		setOptions: setOptions,
		hide: hideLOV,
		remove: removeLOV
	};

	return resObj;
}

var PredictorList = PredictorList || { LOV: {} };

function getScrollbarWidth() {
	var outer = document.createElement("div");
	outer.style.visibility = "hidden";
	outer.style.width = "100px";
	outer.style.msOverflowStyle = "scrollbar";
	document.body.appendChild(outer);
	var widthNoScroll = outer.offsetWidth;

	outer.style.overflow = "scroll";
	var inner = document.createElement("div");
	inner.style.width = "100%";
	outer.appendChild(inner);
	var widthWithScroll = inner.offsetWidth;

	outer.parentNode.removeChild(outer);

	return widthNoScroll - widthWithScroll;
}

function getCSS() {
	var style = document.createElement("style");
	style.appendChild(document.createTextNode(""));
	document.head.appendChild(style);
	return style.sheet;
}

function log(msg) {
	var outMessage = new Date().toUTCString() + " " + msg;
	console.log(outMessage);
}

function reportError(error) {
	var header = error.header || "Error";
	var message = error.message || "";
	var topWindow = window.top.document.open();
	topWindow.write("<!DOCTYPE html><html><body style='height: 100%;'><hr><h1>" + header + "</h1><hr>");
	topWindow.write("<h2>Please contact Support for assistance.</h2><br />");
	topWindow.write('<p style="color:red">' + message + '</p>');
	topWindow.write('</body></html>');
	topWindow.close();
}
