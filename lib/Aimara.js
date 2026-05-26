// AimaraJS - Tree Component
//
// Copyright (c) 2026 Zacharie Monnet
// Licensed under the Apache License, Version 2.0
// Based on the work of Rafael Castro https://github.com/rafaelthca/aimaraJS

///// Creating the tree component
// p_div: ID of the div where the tree will be rendered;
// p_backColor: Background color of the region where the tree is being rendered;
// p_contextMenu: Object containing all the context menus. Set null for no context menu;
// p_options: Optional configuration object;
var aimaraTreeInstanceCounter = 0;
var aimaraTreeInstances = [];

function createTree(p_div,p_backColor,p_contextMenu,p_options) {
	var treeOptions = createTreeOptions(p_options);
	var treeInstanceId = ++aimaraTreeInstanceCounter;
	var treeName = createTreeName(treeOptions,treeInstanceId);
	var nodeIdPrefix = createNodeIdPrefix(treeName,treeInstanceId);
	var contextMenuId = createContextMenuId(treeName,treeInstanceId);

	var tree = {
		name: treeName,
		instanceId: treeInstanceId,
		div: p_div,
		ulElement: null,
		childNodes: [],
		backcolor: p_backColor,
		contextMenu: p_contextMenu,
		options: treeOptions,
		selectedNode: null,
		focusedNode: null,
		nodeCounter: 0,
		nodeIdPrefix: nodeIdPrefix,
		contextMenuId: contextMenuId,
		contextMenuDiv: null,
		documentClickHandler: null,
		rendered: false,
		animationsSuspended: false,
		filterQuery: null,
		eventListeners: {
			select: [],
			beforeOpen: [],
			afterOpen: [],
			beforeClose: [],
			afterClose: []
		},
		resolveImagePath: function(pathOrName) {
			if (pathOrName==undefined || pathOrName===null || pathOrName==='')
				return pathOrName;

			if (typeof pathOrName !== 'string')
				return pathOrName;

			if (/^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i.test(pathOrName))
				return pathOrName;

			if (pathOrName.indexOf('/')!=-1 || pathOrName.indexOf('\\')!=-1)
				return pathOrName;

			return this.options.imagePath + pathOrName;
		},
		setImagePath: function(path) {
			this.options.imagePath = normalizeImagePath(path);
			this.updateToggleImages();
			return this;
		},
		setTheme: function(theme) {
			this.options.theme = normalizeTheme(theme);
			this.updateThemeClass();
			return this;
		},
		setAnimations: function(enabled) {
			this.options.animate = enabled===true;
			this.updateAnimationClass();
			return this;
		},
		on: function(p_eventName,p_callback) {
			if (typeof p_callback!="function")
				return this;

			if (this.eventListeners[p_eventName]==undefined)
				this.eventListeners[p_eventName] = [];

			this.eventListeners[p_eventName].push(p_callback);
			return this;
		},
		emitEvent: function(p_eventName,p_node) {
			var legacyEventName = this.getLegacyEventName(p_eventName);

			if (legacyEventName!=null && this[legacyEventName]!=undefined)
				this[legacyEventName](p_node);

			var listeners = this.eventListeners[p_eventName];
			if (listeners!=undefined) {
				listeners = listeners.slice(0);
				for (var i=0; i<listeners.length; i++)
					listeners[i].call(this,p_node);
			}

			return this;
		},
		getLegacyEventName: function(p_eventName) {
			if (p_eventName=="beforeOpen")
				return "nodeBeforeOpenEvent";
			if (p_eventName=="afterOpen")
				return "nodeAfterOpenEvent";
			if (p_eventName=="beforeClose")
				return "nodeBeforeCloseEvent";
			if (p_eventName=="afterClose")
				return "nodeAfterCloseEvent";

			return null;
		},
		updateAnimationClass: function() {
			setClassName(this.ulElement,'aimara-animate',this.options.animate===true);
			setClassName(this.contextMenuDiv,'aimara-animate',this.options.animate===true);
		},
		updateThemeClass: function() {
			var elements = [ this.ulElement, this.contextMenuDiv ];

			for (var i=0; i<elements.length; i++) {
				setClassName(elements[i],'aimara-theme-light',this.options.theme=="light");
				setClassName(elements[i],'aimara-theme-dark',this.options.theme=="dark");
				setClassName(elements[i],'aimara-theme-auto',this.options.theme=="auto");
			}
		},
		setLineBackground: function(p_element) {
			if (p_element==undefined || p_element==null)
				return;

			if (this.backcolor!=undefined && this.backcolor!==null)
				p_element.style.backgroundColor = this.backcolor;
			else
				p_element.style.backgroundColor = '';
		},
		animationsAllowed: function() {
			if (this.options.animate!==true || this.animationsSuspended)
				return false;

			if (typeof window!="undefined" && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
				return false;

			return true;
		},
		withAnimationsSuspended: function(callback) {
			var previousValue = this.animationsSuspended;
			this.animationsSuspended = true;

			try {
				callback.call(this);
			}
			finally {
				this.animationsSuspended = previousValue;
			}
		},
		setChildrenVisibility: function(p_ul,p_visible) {
			if (p_ul==undefined || p_ul==null)
				return;

			if (!this.animationsAllowed()) {
				this.resetChildrenAnimation(p_ul);
				p_ul.style.display = p_visible ? 'block' : 'none';
				return;
			}

			this.animateChildrenVisibility(p_ul,p_visible);
		},
		resetChildrenAnimation: function(p_ul) {
			if (p_ul.aimaraTransitionHandler!=undefined && p_ul.removeEventListener!=undefined)
				p_ul.removeEventListener('transitionend',p_ul.aimaraTransitionHandler);

			if (p_ul.aimaraAnimationTimer!=undefined) {
				window.clearTimeout(p_ul.aimaraAnimationTimer);
				p_ul.aimaraAnimationTimer = undefined;
			}

			p_ul.aimaraTransitionHandler = undefined;
			p_ul.style.maxHeight = '';
			p_ul.style.opacity = '';
			p_ul.style.transform = '';
			p_ul.style.overflow = '';
			p_ul.style.transition = '';
			p_ul.style.willChange = '';
		},
		animateChildrenVisibility: function(p_ul,p_visible) {
			this.resetChildrenAnimation(p_ul);

			var requestFrame = window.requestAnimationFrame || function(callback) {
				return window.setTimeout(callback,16);
			};

			p_ul.style.overflow = 'hidden';
			p_ul.style.transition = 'max-height 160ms ease, opacity 140ms ease, transform 160ms ease';
			p_ul.style.willChange = 'max-height, opacity, transform';

			if (p_visible) {
				p_ul.style.display = 'block';
				p_ul.style.maxHeight = '0px';
				p_ul.style.opacity = '0';
				p_ul.style.transform = 'translateY(-2px)';

				requestFrame(function() {
					p_ul.style.maxHeight = p_ul.scrollHeight + 'px';
					p_ul.style.opacity = '1';
					p_ul.style.transform = 'translateY(0)';
				});
			}
			else {
				p_ul.style.maxHeight = p_ul.scrollHeight + 'px';
				p_ul.style.opacity = '1';
				p_ul.style.transform = 'translateY(0)';

				requestFrame(function() {
					p_ul.style.maxHeight = '0px';
					p_ul.style.opacity = '0';
					p_ul.style.transform = 'translateY(-2px)';
				});
			}

			var finishAnimation = function(event) {
				if (event!=undefined && event.target!==p_ul)
					return;

				if (p_ul.removeEventListener!=undefined)
					p_ul.removeEventListener('transitionend',finishAnimation);

				if (p_ul.aimaraAnimationTimer!=undefined) {
					window.clearTimeout(p_ul.aimaraAnimationTimer);
					p_ul.aimaraAnimationTimer = undefined;
				}

				if (!p_visible)
					p_ul.style.display = 'none';

				p_ul.aimaraTransitionHandler = undefined;
				p_ul.style.maxHeight = '';
				p_ul.style.opacity = '';
				p_ul.style.transform = '';
				p_ul.style.overflow = '';
				p_ul.style.transition = '';
				p_ul.style.willChange = '';
			};

			p_ul.aimaraTransitionHandler = finishAnimation;

			if (p_ul.addEventListener!=undefined)
				p_ul.addEventListener('transitionend',finishAnimation);

			p_ul.aimaraAnimationTimer = window.setTimeout(function() {
				finishAnimation({ target: p_ul });
			},220);
		},
		updateToggleImages: function() {
			var updateNodeToggle = function(p_node) {
				if (p_node.elementLi!=null) {
					var v_img = p_node.elementLi.getElementsByTagName("img")[0];
					if (v_img!=undefined && v_img.className=="exp_col") {
						if (p_node.childNodes.length>0 && !p_node.expanded)
							v_img.src = tree.resolveImagePath('expand.png');
						else
							v_img.src = tree.resolveImagePath('collapse.png');
					}
				}

				for (var i=0; i<p_node.childNodes.length; i++)
					updateNodeToggle(p_node.childNodes[i]);
			};

			for (var i=0; i<this.childNodes.length; i++)
				updateNodeToggle(this.childNodes[i]);
		},
		getNodeLabelElement: function(p_node) {
			if (p_node==undefined || p_node.elementLi==undefined || p_node.elementLi==null)
				return null;

			var spans = p_node.elementLi.getElementsByTagName("span");
			if (spans.length==0)
				return null;

			return spans[0];
		},
		getFilterText: function(p_node) {
			var span = this.getNodeLabelElement(p_node);
			if (span!=null) {
				var links = span.getElementsByTagName("a");
				if (links.length>0) {
					var text = links[links.length-1].textContent;
					if (text==undefined)
						text = links[links.length-1].innerText;
					if (text!=undefined)
						return text;
				}
			}

			if (p_node.text==undefined || p_node.text==null)
				return "";

			return String(p_node.text).replace(/<[^>]*>/g," ");
		},
		filter: function(p_query) {
			var query = "";

			if (p_query!=undefined && p_query!=null)
				query = String(p_query).replace(/^\s+|\s+$/g,"").toLowerCase();

			if (query=="")
				return this.clearFilter();

			this.filterQuery = query;

			if (this.rendered)
				this.applyFilter();

			return this;
		},
		clearFilter: function() {
			this.filterQuery = null;

			if (!this.rendered)
				return this;

			setClassName(this.ulElement,'aimara-filtered',false);

			for (var i=0; i<this.childNodes.length; i++)
				this.clearNodeFilter(this.childNodes[i]);

			this.updateNodeAccessibility();

			return this;
		},
		applyFilter: function() {
			if (!this.rendered || this.filterQuery==null)
				return this;

			setClassName(this.ulElement,'aimara-filtered',true);

			for (var i=0; i<this.childNodes.length; i++)
				this.applyFilterToNode(this.childNodes[i],this.filterQuery);

			this.updateNodeAccessibility();

			return this;
		},
		applyFilterToNode: function(p_node,p_query) {
			var nodeMatches = this.getFilterText(p_node).toLowerCase().indexOf(p_query)!=-1;
			var childMatches = false;

			for (var i=0; i<p_node.childNodes.length; i++) {
				if (this.applyFilterToNode(p_node.childNodes[i],p_query))
					childMatches = true;
			}

			var nodeVisible = nodeMatches || childMatches;

			if (p_node.elementLi!=null)
				p_node.elementLi.style.display = nodeVisible ? "" : "none";

			setClassName(this.getNodeLabelElement(p_node),'aimara-filter-match',nodeMatches);

			var childList = this.getNodeChildListElement(p_node);
			if (childList!=null) {
				this.resetChildrenAnimation(childList);
				if (p_node.childNodes.length==0)
					childList.style.display = "";
				else
					childList.style.display = childMatches ? "block" : "none";
			}

			return nodeVisible;
		},
		clearNodeFilter: function(p_node) {
			if (p_node.elementLi!=null)
				p_node.elementLi.style.display = "";

			setClassName(this.getNodeLabelElement(p_node),'aimara-filter-match',false);

			var childList = this.getNodeChildListElement(p_node);
			if (childList!=null) {
				this.resetChildrenAnimation(childList);
				if (p_node.childNodes.length>0)
					childList.style.display = p_node.expanded ? "block" : "none";
				else
					childList.style.display = "";
			}

			for (var i=0; i<p_node.childNodes.length; i++)
				this.clearNodeFilter(p_node.childNodes[i]);
		},
		getNodeChildListElement: function(p_node) {
			if (p_node==undefined || p_node.elementLi==undefined || p_node.elementLi==null)
				return null;

			var lists = p_node.elementLi.getElementsByTagName("ul");
			if (lists.length==0)
				return null;

			return lists[0];
		},
		isElementVisible: function(p_element) {
			var element = p_element;

			while (element!=undefined && element!=null) {
				if (element.style!=undefined && element.style.display=="none")
					return false;

				if (element==this.ulElement)
					break;

				element = element.parentNode;
			}

			return true;
		},
		isNodeVisible: function(p_node) {
			return p_node!=undefined && p_node!=null && p_node.elementLi!=undefined && p_node.elementLi!=null && this.isElementVisible(p_node.elementLi);
		},
		isChildGroupVisible: function(p_node) {
			var childList = this.getNodeChildListElement(p_node);
			return childList!=null && childList.style.display!="none" && this.isElementVisible(childList);
		},
		getVisibleNodes: function() {
			var visibleNodes = [];
			this.collectVisibleNodes(this.childNodes,visibleNodes);
			return visibleNodes;
		},
		collectVisibleNodes: function(p_nodes,p_visibleNodes) {
			for (var i=0; i<p_nodes.length; i++) {
				var node = p_nodes[i];
				if (!this.isNodeVisible(node))
					continue;

				p_visibleNodes.push(node);

				if (this.isChildGroupVisible(node))
					this.collectVisibleNodes(node.childNodes,p_visibleNodes);
			}
		},
		getFirstVisibleNode: function() {
			var visibleNodes = this.getVisibleNodes();
			if (visibleNodes.length==0)
				return null;

			return visibleNodes[0];
		},
		getFocusableNode: function() {
			if (this.focusedNode!=null && this.isNodeVisible(this.focusedNode))
				return this.focusedNode;

			if (this.selectedNode!=null && this.isNodeVisible(this.selectedNode))
				return this.selectedNode;

			return this.getFirstVisibleNode();
		},
		isNodeExpandedForAccessibility: function(p_node) {
			if (p_node==undefined || p_node==null || p_node.childNodes==undefined || p_node.childNodes.length==0)
				return false;

			if (this.filterQuery!=null)
				return this.isChildGroupVisible(p_node);

			return p_node.expanded===true;
		},
		updateNodeAccessibility: function() {
			if (!this.rendered || this.ulElement==undefined || this.ulElement==null)
				return;

			this.ulElement.setAttribute('role','tree');

			var focusableNode = this.getFocusableNode();
			this.focusedNode = focusableNode;
			this.updateNodeAccessibilityRecursive(this.childNodes,focusableNode);
		},
		updateNodeAccessibilityRecursive: function(p_nodes,p_focusableNode) {
			for (var i=0; i<p_nodes.length; i++) {
				this.updateNodeAccessibilityForNode(p_nodes[i],p_focusableNode);
				this.updateNodeAccessibilityRecursive(p_nodes[i].childNodes,p_focusableNode);
			}
		},
		updateNodeAccessibilityForNode: function(p_node,p_focusableNode) {
			if (p_node==undefined || p_node==null || p_node.elementLi==undefined || p_node.elementLi==null)
				return;

			var expanded = this.isNodeExpandedForAccessibility(p_node);
			var childList = this.getNodeChildListElement(p_node);

			p_node.elementLi.setAttribute('role','treeitem');
			p_node.elementLi.setAttribute('aria-labelledby',p_node.id + '_label');
			p_node.elementLi.setAttribute('aria-selected',this.selectedNode==p_node ? 'true' : 'false');
			p_node.elementLi.setAttribute('tabindex',p_node==p_focusableNode ? '0' : '-1');

			if (p_node.childNodes.length>0)
				p_node.elementLi.setAttribute('aria-expanded',expanded ? 'true' : 'false');
			else
				p_node.elementLi.removeAttribute('aria-expanded');

			if (childList!=null) {
				if (p_node.childNodes.length>0) {
					childList.setAttribute('role','group');
					childList.setAttribute('aria-hidden',expanded ? 'false' : 'true');
				}
				else {
					childList.removeAttribute('role');
					childList.removeAttribute('aria-hidden');
				}
			}
		},
		focusNode: function(p_node) {
			if (!this.isNodeVisible(p_node))
				return;

			this.focusedNode = p_node;
			this.updateNodeAccessibility();

			if (p_node.elementLi!=null && p_node.elementLi.focus!=undefined)
				p_node.elementLi.focus();
		},
		focusFirstChildNode: function(p_node) {
			if (p_node==undefined || p_node==null || p_node.childNodes==undefined)
				return false;

			for (var i=0; i<p_node.childNodes.length; i++) {
				if (this.isNodeVisible(p_node.childNodes[i])) {
					this.focusNode(p_node.childNodes[i]);
					return true;
				}
			}

			return false;
		},
		moveFocusBy: function(p_node,p_direction) {
			var visibleNodes = this.getVisibleNodes();
			if (visibleNodes.length==0)
				return;

			var currentIndex = visibleNodes.indexOf(p_node);
			if (currentIndex==-1)
				currentIndex = visibleNodes.indexOf(this.focusedNode);
			if (currentIndex==-1)
				currentIndex = 0;

			var nextIndex = currentIndex + p_direction;
			if (nextIndex<0)
				nextIndex = 0;
			if (nextIndex>=visibleNodes.length)
				nextIndex = visibleNodes.length - 1;

			this.focusNode(visibleNodes[nextIndex]);
		},
		getKeyboardKey: function(p_event) {
			if (p_event==undefined || p_event==null)
				return null;

			if (p_event.key!=undefined) {
				if (p_event.key=="Spacebar" || p_event.key=="Space")
					return " ";
				if (p_event.key=="Right")
					return "ArrowRight";
				if (p_event.key=="Left")
					return "ArrowLeft";
				if (p_event.key=="Up")
					return "ArrowUp";
				if (p_event.key=="Down")
					return "ArrowDown";

				return p_event.key;
			}

			if (p_event.keyCode==13)
				return "Enter";
			if (p_event.keyCode==32)
				return " ";
			if (p_event.keyCode==37)
				return "ArrowLeft";
			if (p_event.keyCode==38)
				return "ArrowUp";
			if (p_event.keyCode==39)
				return "ArrowRight";
			if (p_event.keyCode==40)
				return "ArrowDown";
			if (p_event.keyCode==36)
				return "Home";
			if (p_event.keyCode==35)
				return "End";

			return null;
		},
		preventKeyboardDefault: function(p_event) {
			if (p_event.preventDefault!=undefined)
				p_event.preventDefault();
			else
				p_event.returnValue = false;

			if (p_event.stopPropagation!=undefined)
				p_event.stopPropagation();
			else
				p_event.cancelBubble = true;
		},
		handleNodeKeyDown: function(p_event,p_node) {
			if (p_node==undefined || p_node==null)
				return true;

			var key = this.getKeyboardKey(p_event);

			if (key=="Enter" || key==" ") {
				this.preventKeyboardDefault(p_event);
				this.selectNode(p_node);
				this.focusNode(p_node);
				this.toggleNode(p_node);
				return false;
			}

			if (key=="ArrowRight") {
				this.preventKeyboardDefault(p_event);
				this.focusNode(p_node);
				if (p_node.childNodes.length>0) {
					if (!p_node.expanded)
						this.expandNode(p_node);
					else
						this.focusFirstChildNode(p_node);
				}
				return false;
			}

			if (key=="ArrowLeft") {
				this.preventKeyboardDefault(p_event);
				this.focusNode(p_node);
				if (p_node.childNodes.length>0 && p_node.expanded)
					this.collapseNode(p_node);
				else if (p_node.parent!=undefined && p_node.parent!=this)
					this.focusNode(p_node.parent);
				return false;
			}

			if (key=="ArrowDown") {
				this.preventKeyboardDefault(p_event);
				this.moveFocusBy(p_node,1);
				return false;
			}

			if (key=="ArrowUp") {
				this.preventKeyboardDefault(p_event);
				this.moveFocusBy(p_node,-1);
				return false;
			}

			if (key=="Home" || key=="End") {
				this.preventKeyboardDefault(p_event);
				var visibleNodes = this.getVisibleNodes();
				if (visibleNodes.length>0)
					this.focusNode(key=="Home" ? visibleNodes[0] : visibleNodes[visibleNodes.length - 1]);
				return false;
			}

			return true;
		},
		getToggleId: function(p_node,p_expanded) {
			return (p_expanded ? 'toggle_off_' : 'toggle_on_') + p_node.id;
		},
		hideContextMenu: function() {
			if (this.contextMenuDiv!=null)
				this.contextMenuDiv.style.display = 'none';
		},
		clearNodeDomReferences: function(p_node) {
			if (p_node==undefined || p_node==null)
				return;

			p_node.elementLi = null;

			if (p_node.childNodes==undefined)
				return;

			for (var i=0; i<p_node.childNodes.length; i++)
				this.clearNodeDomReferences(p_node.childNodes[i]);
		},
		containsNode: function(p_rootNode,p_node) {
			if (p_rootNode==undefined || p_rootNode==null || p_node==undefined || p_node==null)
				return false;

			if (p_rootNode==p_node)
				return true;

			if (p_rootNode.childNodes==undefined)
				return false;

			for (var i=0; i<p_rootNode.childNodes.length; i++) {
				if (this.containsNode(p_rootNode.childNodes[i],p_node))
					return true;
			}

			return false;
		},
		///// Creating a new node
		// p_text: Text displayed on the node;
		// p_expanded: True or false, indicating wether the node starts expanded or not;
		// p_icon: Relative path to the icon displayed with the node. Set null if the node has no icon;
		// p_parentNode: Reference to the parent node. Set null to create the node on the root;
		// p_tag: Tag is used to store additional information on the node. All node attributes are visible when programming events and context menu actions;
		// p_contextmenu: Name of the context menu, which is one of the attributes of the p_contextMenu object created with the tree;
		createNode: function(p_text,p_expanded, p_icon, p_parentNode,p_tag,p_contextmenu) {
			var v_tree = this;
			var parentHadChildren = p_parentNode!=undefined && p_parentNode.childNodes.length>0;
			var node = {
				id: this.nodeIdPrefix + this.nodeCounter,
				text: p_text,
				icon: p_icon,
				parent: p_parentNode,
				expanded : p_expanded,
				childNodes : [],
				tag : p_tag,
				contextMenu: p_contextmenu,
				elementLi: null,
				///// Removing the node and all its children
				removeNode: function() { v_tree.removeNode(this); },
				///// Expanding or collapsing the node, depending on the expanded value
				toggleNode: function(p_event) { v_tree.toggleNode(this); },
				///// Expanding the node
				expandNode: function(p_event) { v_tree.expandNode(this); },
				///// Expanding the node and its children recursively
				expandSubtree: function() { v_tree.expandSubtree(this); },
				///// Changing the node text
				// p_text: New text;
				setText: function(p_text) { v_tree.setText(this,p_text); },
				///// Collapsing the node
				collapseNode: function() { v_tree.collapseNode(this); },
				///// Collapsing the node and its children recursively
				collapseSubtree: function() { v_tree.collapseSubtree(this); },
				///// Deleting all child nodes
				removeChildNodes: function() { v_tree.removeChildNodes(this); },
				///// Creating a new child node;
				// p_text: Text displayed;
				// p_expanded: True or false, indicating wether the node starts expanded or not;
				// p_icon: Icon;
				// p_tag: Tag;
				// p_contextmenu: Context Menu;
				createChildNode: function(p_text,p_expanded,p_icon,p_tag,p_contextmenu) { return v_tree.createNode(p_text,p_expanded,p_icon,this,p_tag,p_contextmenu); }
			};

			this.nodeCounter++;

			if (p_parentNode==undefined) {
				this.childNodes.push(node);
				node.parent=this;
			}
			else
				p_parentNode.childNodes.push(node);

			if (this.rendered) {
				if (p_parentNode==undefined) {
					if (this.ulElement!=null) {
						this.drawNode(this.ulElement,node);
						this.adjustLines(this.ulElement,false);
					}
				}
				else {
					var v_ul = this.getNodeChildListElement(p_parentNode);
					if (v_ul!=null && !parentHadChildren) {
						var v_img = p_parentNode.elementLi.getElementsByTagName("img")[0];

						if (p_parentNode.expanded) {
							this.setChildrenVisibility(v_ul,true);
							if (v_img!=undefined) {
								v_img.style.visibility = "visible";
								v_img.src = this.resolveImagePath('collapse.png');
								v_img.id = this.getToggleId(p_parentNode,true);
							}
						}
						else {
							v_ul.style.display = 'none';
							if (v_img!=undefined) {
								v_img.style.visibility = "visible";
								v_img.src = this.resolveImagePath('expand.png');
								v_img.id = this.getToggleId(p_parentNode,false);
							}
						}
					}

					if (v_ul!=null) {
						this.drawNode(v_ul,node);
						this.adjustLines(v_ul,false);
					}
				}
			}

			if (this.rendered) {
				if (this.filterQuery!=null)
					this.applyFilter();
				else
					this.updateNodeAccessibility();
			}

			return node;
		},
		///// Render the tree;
		drawTree: function() {

			this.rendered = true;

			var div_tree = document.getElementById(this.div);
			if (div_tree==null) {
				this.rendered = false;
				return;
			}

			div_tree.innerHTML = '';

			var ulElement = createSimpleElement('ul',this.name,'tree aimara-tree');
			ulElement.setAttribute('role','tree');
			this.ulElement = ulElement;
			this.updateThemeClass();
			this.updateAnimationClass();

			for (var i=0; i<this.childNodes.length; i++) {
				this.drawNode(ulElement,this.childNodes[i]);
			}

			div_tree.appendChild(ulElement);

			this.adjustLines(ulElement,true);

			if (this.filterQuery!=null)
				this.applyFilter();
			else
				this.updateNodeAccessibility();

		},
		///// Drawing the node. This function is used when drawing the Tree and should not be called directly;
		// p_ulElement: Reference to the UL tag element where the node should be created;
		// p_node: Reference to the node object;
		drawNode: function(p_ulElement,p_node) {
			if (p_ulElement==undefined || p_ulElement==null || p_node==undefined || p_node==null)
				return;

			var v_tree = this;

			var v_icon = null;

			if (p_node.icon!=null)
				v_icon = createImgElement(null,'icon_tree',p_node.icon);

			var v_li = document.createElement('li');
			v_li.setAttribute('role','treeitem');
			v_li.setAttribute('tabindex','-1');
			p_node.elementLi = v_li;

			var v_span = createSimpleElement('span',p_node.id + '_label',this.selectedNode==p_node ? 'node_selected' : 'node');
			v_li.setAttribute('aria-labelledby',v_span.id);
			v_li.setAttribute('aria-selected',this.selectedNode==p_node ? 'true' : 'false');

			var v_exp_col = null;

			if (p_node.childNodes.length == 0) {
				v_exp_col = createImgElement(this.getToggleId(p_node,true),'exp_col',this.resolveImagePath('collapse.png'));
				v_exp_col.style.visibility = "hidden";
			}
			else {
				v_li.setAttribute('aria-expanded',p_node.expanded ? 'true' : 'false');
				if (p_node.expanded) {
					v_exp_col = createImgElement(this.getToggleId(p_node,true),'exp_col',this.resolveImagePath('collapse.png'));
				}
				else {
					v_exp_col = createImgElement(this.getToggleId(p_node,false),'exp_col',this.resolveImagePath('expand.png'));
				}
			}
			v_exp_col.setAttribute('aria-hidden','true');

			v_span.ondblclick = function() {
				v_tree.doubleClickNode(p_node);
			};

			v_exp_col.onclick = function() {
				v_tree.focusNode(p_node);
				v_tree.toggleNode(p_node);
			};

			v_span.onclick = function() {
				v_tree.selectNode(p_node);
				v_tree.focusNode(p_node);
			};

			v_span.oncontextmenu = function(e) {
				v_tree.selectNode(p_node);
				v_tree.focusNode(p_node);
				v_tree.nodeContextMenu(e,p_node);
			};

			v_li.onfocus = function() {
				v_tree.focusedNode = p_node;
				v_tree.updateNodeAccessibility();
			};

			v_li.onkeydown = function(e) {
				return v_tree.handleNodeKeyDown(e || window.event,p_node);
			};

			if (v_icon!=undefined)
				v_span.appendChild(v_icon);

				var v_a = createSimpleElement('a',null,null);
				if (this.options.allowHtmlLabels===false)
					v_a.appendChild(document.createTextNode(p_node.text==undefined || p_node.text==null ? '' : p_node.text));
				else
				v_a.innerHTML=p_node.text;
				v_span.appendChild(v_a);
				v_li.appendChild(v_exp_col);
				v_li.appendChild(v_span);

			p_ulElement.appendChild(v_li);

			var v_ul = createSimpleElement('ul','ul_' + p_node.id,null);
			if (p_node.childNodes.length>0) {
				v_ul.setAttribute('role','group');
				v_ul.setAttribute('aria-hidden',p_node.expanded ? 'false' : 'true');
			}
			v_li.appendChild(v_ul);

			if (p_node.childNodes.length > 0) {

				if (!p_node.expanded)
					v_ul.style.display = 'none';

				for (var i=0; i<p_node.childNodes.length; i++) {
					this.drawNode(v_ul,p_node.childNodes[i]);
				}
			}
		},
		///// Changing node text
		// p_node: Reference to the node that will have its text updated;
		// p_text: New text;
		setText: function(p_node,p_text) {
			if (p_node==undefined || p_node==null)
				return;

			p_node.text = p_text;

			var span = this.getNodeLabelElement(p_node);
			if (span!=null && span.lastChild!=undefined) {
				if (this.options.allowHtmlLabels===false) {
					span.lastChild.innerHTML = '';
					span.lastChild.appendChild(document.createTextNode(p_text==undefined || p_text==null ? '' : p_text));
				}
				else
					span.lastChild.innerHTML = p_text;
			}

			if (this.filterQuery!=null)
				this.applyFilter();
		},
		///// Expanding all tree nodes
		expandTree: function() {
			this.withAnimationsSuspended(function() {
				for (var i=0; i<this.childNodes.length; i++) {
					if (this.childNodes[i].childNodes.length>0) {
						this.expandSubtree(this.childNodes[i]);
					}
				}
			});
		},
		///// Expanding all nodes inside the subtree that have parameter 'p_node' as root
		// p_node: Subtree root;
		expandSubtree: function(p_node) {
			if (p_node==undefined || p_node==null)
				return;

			if (!this.animationsSuspended) {
				var v_tree = this;
				this.withAnimationsSuspended(function() {
					v_tree.expandSubtree(p_node);
				});
				return;
			}

			this.expandNode(p_node);
			for (var i=0; i<p_node.childNodes.length; i++) {
				if (p_node.childNodes[i].childNodes.length>0) {
					this.expandSubtree(p_node.childNodes[i]);
				}
			}
		},
		///// Collapsing all tree nodes
		collapseTree: function() {
			this.withAnimationsSuspended(function() {
				for (var i=0; i<this.childNodes.length; i++) {
					if (this.childNodes[i].childNodes.length>0) {
						this.collapseSubtree(this.childNodes[i]);
					}
				}
			});
		},
		///// Collapsing all nodes inside the subtree that have parameter 'p_node' as root
		// p_node: Subtree root;
		collapseSubtree: function(p_node) {
			if (p_node==undefined || p_node==null)
				return;

			if (!this.animationsSuspended) {
				var v_tree = this;
				this.withAnimationsSuspended(function() {
					v_tree.collapseSubtree(p_node);
				});
				return;
			}

			this.collapseNode(p_node);
			for (var i=0; i<p_node.childNodes.length; i++) {
				if (p_node.childNodes[i].childNodes.length>0) {
					this.collapseSubtree(p_node.childNodes[i]);
				}
			}
		},
		///// Expanding node
		// p_node: Reference to the node;
		expandNode: function(p_node) {
			if (p_node==undefined || p_node==null || p_node.childNodes==undefined)
				return;

			if (p_node.childNodes.length>0 && p_node.expanded==false) {
				this.emitEvent("beforeOpen",p_node);

				p_node.expanded = true;

				if (p_node.elementLi!=null) {
					var img=p_node.elementLi.getElementsByTagName("img")[0];
					if (img!=undefined) {
						img.id=this.getToggleId(p_node,true);
						img.src = this.resolveImagePath('collapse.png');
						var elem_ul = this.getNodeChildListElement(p_node);
						this.setChildrenVisibility(elem_ul,true);
					}
				}

				this.emitEvent("afterOpen",p_node);

				if (this.filterQuery!=null)
					this.applyFilter();
				else
					this.updateNodeAccessibility();
			}
		},
		///// Collapsing node
		// p_node: Reference to the node;
		collapseNode: function(p_node) {
			if (p_node==undefined || p_node==null || p_node.childNodes==undefined)
				return;

			if (p_node.childNodes.length>0 && p_node.expanded==true) {
				p_node.expanded = false;
				if (this.focusedNode!=null && this.containsNode(p_node,this.focusedNode))
					this.focusedNode = p_node;
				this.emitEvent("beforeClose",p_node);

				if (p_node.elementLi!=null) {
					var img=p_node.elementLi.getElementsByTagName("img")[0];
					if (img!=undefined) {
						img.id=this.getToggleId(p_node,false);
						img.src = this.resolveImagePath('expand.png');
						var elem_ul = this.getNodeChildListElement(p_node);
						this.setChildrenVisibility(elem_ul,false);
					}
				}

				this.emitEvent("afterClose",p_node);

				if (this.filterQuery!=null)
					this.applyFilter();
				else
					this.updateNodeAccessibility();
			}
		},
		///// Toggling node
		// p_node: Reference to the node;
		toggleNode: function(p_node) {
			if (p_node==undefined || p_node==null || p_node.childNodes==undefined)
				return;

			if (p_node.childNodes.length>0) {
				if (p_node.expanded)
					p_node.collapseNode();
				else
					p_node.expandNode();
			}
		},
		///// Double clicking node
		// p_node: Reference to the node;
		doubleClickNode: function(p_node) {
			this.toggleNode(p_node);
		},
		///// Selecting node
		// p_node: Reference to the node;
		selectNode: function(p_node) {
			if (p_node==undefined || p_node==null)
				return;

			var span = this.getNodeLabelElement(p_node);
			setClassName(span,'node',false);
			setClassName(span,'node_selected',true);
			if (this.selectedNode!=null && this.selectedNode!=p_node) {
				var selectedSpan = this.getNodeLabelElement(this.selectedNode);
				setClassName(selectedSpan,'node_selected',false);
				setClassName(selectedSpan,'node',true);
			}
			this.selectedNode = p_node;
			this.focusedNode = p_node;
			this.updateNodeAccessibility();
			this.emitEvent("select",p_node);
		},
		///// Deleting node
		// p_node: Reference to the node;
		removeNode: function(p_node) {
			if (p_node==undefined || p_node==null || p_node.parent==undefined || p_node.parent==null || p_node.parent.childNodes==undefined)
				return;

			var parentNode = p_node.parent;
			var index = parentNode.childNodes.indexOf(p_node);
			var wasLast = p_node.elementLi!=null && /\blast\b/.test(p_node.elementLi.className);

			if (index==-1 && p_node.elementLi==null)
				return;

			if (index!=-1)
				parentNode.childNodes.splice(index, 1);

			if (wasLast && index>0 && parentNode.childNodes[index-1]!=undefined && parentNode.childNodes[index-1].elementLi!=null) {
				setClassName(parentNode.childNodes[index-1].elementLi,'last',true);
				this.setLineBackground(parentNode.childNodes[index-1].elementLi);
			}

			if (p_node.elementLi!=null && p_node.elementLi.parentNode!=null)
				p_node.elementLi.parentNode.removeChild(p_node.elementLi);

			if (parentNode.childNodes.length==0 && parentNode.elementLi!=undefined && parentNode.elementLi!=null) {
				var v_img = parentNode.elementLi.getElementsByTagName("img")[0];
				if (v_img!=undefined)
					v_img.style.visibility = "hidden";
			}

			if (this.selectedNode!=null && this.containsNode(p_node,this.selectedNode))
				this.selectedNode = null;
			if (this.focusedNode!=null && this.containsNode(p_node,this.focusedNode))
				this.focusedNode = null;

			this.clearNodeDomReferences(p_node);
			p_node.parent = null;

			if (parentNode==this && this.ulElement!=null)
				this.adjustLines(this.ulElement,false);
			else {
				var parentList = this.getNodeChildListElement(parentNode);
				if (parentList!=null)
					this.adjustLines(parentList,false);
			}

			if (this.filterQuery!=null)
				this.applyFilter();
			else
				this.updateNodeAccessibility();

		},
		///// Deleting all node children
		// p_node: Reference to the node;
		removeChildNodes: function(p_node) {
			if (p_node==undefined || p_node==null || p_node.childNodes==undefined)
				return;

			if (p_node.childNodes.length>0) {
				var v_ul = this.getNodeChildListElement(p_node);

				if (p_node.elementLi!=null) {
					var v_img = p_node.elementLi.getElementsByTagName("img")[0];
					if (v_img!=undefined)
						v_img.style.visibility = "hidden";
				}

				if (this.selectedNode!=null) {
					for (var i=0; i<p_node.childNodes.length; i++) {
						if (this.containsNode(p_node.childNodes[i],this.selectedNode)) {
							this.selectedNode = null;
							break;
						}
					}
				}
				if (this.focusedNode!=null) {
					for (var i=0; i<p_node.childNodes.length; i++) {
						if (this.containsNode(p_node.childNodes[i],this.focusedNode)) {
							this.focusedNode = null;
							break;
						}
					}
				}

				for (var i=0; i<p_node.childNodes.length; i++) {
					this.clearNodeDomReferences(p_node.childNodes[i]);
					p_node.childNodes[i].parent = null;
				}

				p_node.childNodes = [];
				if (v_ul!=null)
					v_ul.innerHTML = "";

				if (this.filterQuery!=null)
					this.applyFilter();
				else
					this.updateNodeAccessibility();
			}
		},
		///// Rendering context menu when mouse right button is pressed over a node. This function should no be called directly
		// p_event: Event triggered when right clicking;
		// p_node: Reference to the node;
		nodeContextMenu: function(p_event,p_node) {
			if (p_event!=undefined && p_event.button==2) {
				p_event.preventDefault();
				p_event.stopPropagation();
				if (p_node!=undefined && p_node.contextMenu!=undefined && this.contextMenu!=undefined && this.contextMenu!=null) {

					var v_tree = this;

					var v_menu = this.contextMenu[p_node.contextMenu];
					if (v_menu==undefined || v_menu.elements==undefined)
						return;

					hideAimaraContextMenus(this);

					var v_div;
					if (this.contextMenuDiv==null) {
						v_div = createSimpleElement('ul',this.contextMenuId,'menu');
						document.body.appendChild(v_div);
					}
					else
						v_div = this.contextMenuDiv;

					setClassName(v_div,'aimara-animate',this.options.animate===true);
					v_div.innerHTML = '';

					var v_left = p_event.pageX-5;
					var v_right = p_event.pageY-5;

					v_div.style.display = 'block';
					v_div.style.position = 'absolute';
					v_div.style.left = v_left + 'px';
					v_div.style.top = v_right + 'px';

					for (var i=0; i<v_menu.elements.length; i++) (function(i){

						var v_li = createSimpleElement('li',null,null);

						var v_span = createSimpleElement('span',null,null);
						v_span.onclick = function () {
							if (typeof v_menu.elements[i].action=="function")
								v_menu.elements[i].action(p_node);
						};

						var v_a = createSimpleElement('a',null,null);
						var v_ul = createSimpleElement('ul',null,'sub-menu');

						v_a.appendChild(document.createTextNode(v_menu.elements[i].text));

						v_li.appendChild(v_span);

						if (v_menu.elements[i].icon!=undefined) {
							var v_img = createImgElement(null,null,v_menu.elements[i].icon);
							v_li.appendChild(v_img);
						}

						v_li.appendChild(v_a);
						v_li.appendChild(v_ul);
						v_div.appendChild(v_li);

						var submenu = v_menu.elements[i].submenu || v_menu.elements[i].p_submenu;
						if (submenu!=undefined) {
							var v_span_more = createSimpleElement('div',null,null);
							v_span_more.appendChild(createImgElement(null,'menu_img',v_tree.resolveImagePath('right.png')));
							v_li.appendChild(v_span_more);
							v_tree.contextMenuLi(submenu,v_ul,p_node);
						}

					})(i);

					this.contextMenuDiv = v_div;
					this.updateThemeClass();

				}
			}
		},
		///// Recursive function called when rendering context menu submenus. This function should no be called directly
		// p_submenu: Reference to the submenu object;
		// p_ul: Reference to the UL tag;
		// p_node: Reference to the node;
		contextMenuLi : function(p_submenu,p_ul,p_node) {
			if (p_submenu==undefined || p_submenu.elements==undefined || p_ul==undefined || p_ul==null)
				return;

			var v_tree = this;

			for (var i=0; i<p_submenu.elements.length; i++) (function(i){

				var v_li = createSimpleElement('li',null,null);

				var v_span = createSimpleElement('span',null,null);
				v_span.onclick = function () {
					if (typeof p_submenu.elements[i].action=="function")
						p_submenu.elements[i].action(p_node);
				};

				var v_a = createSimpleElement('a',null,null);
				var v_ul = createSimpleElement('ul',null,'sub-menu');

				v_a.appendChild(document.createTextNode(p_submenu.elements[i].text));

				v_li.appendChild(v_span);

				if (p_submenu.elements[i].icon!=undefined) {
					var v_img = createImgElement(null,null,p_submenu.elements[i].icon);
					v_li.appendChild(v_img);
				}

				v_li.appendChild(v_a);
				v_li.appendChild(v_ul);
				p_ul.appendChild(v_li);

				var submenu = p_submenu.elements[i].submenu || p_submenu.elements[i].p_submenu;
				if (submenu!=undefined) {
					var v_span_more = createSimpleElement('div',null,null);
					v_span_more.appendChild(createImgElement(null,'menu_img',v_tree.resolveImagePath('right.png')));
					v_li.appendChild(v_span_more);
					v_tree.contextMenuLi(submenu,v_ul,p_node);
				}

			})(i);
		},
		///// Adjusting tree dotted lines. This function should not be called directly
		// p_node: Reference to the node;
		adjustLines: function(p_ul,p_recursive) {
			if (p_ul==undefined || p_ul==null)
				return;

			var tree = p_ul;

      var lists = [];

			if (tree.childNodes.length>0) {
				lists = [ tree ];

				if (p_recursive) {
		      for (var i = 0; i < tree.getElementsByTagName("ul").length; i++) {
						var check_ul = tree.getElementsByTagName("ul")[i];
						if (check_ul.childNodes.length!=0)
		        	lists[lists.length] = check_ul;
					}
				}

			}

      for (var i = 0; i < lists.length; i++) {
        var item = lists[i].lastChild;

        while (item!=null && (!item.tagName || item.tagName.toLowerCase() != "li")) {
     	  item = item.previousSibling;
				}

				if (item==null)
					continue;

        setClassName(item,'last',true);
				this.setLineBackground(item);

				item = item.previousSibling;

				while (item!=null && (!item.tagName || item.tagName.toLowerCase() != "li"))
					item = item.previousSibling;

				if (item!=null && item.tagName.toLowerCase() == "li") {
					setClassName(item,'last',false);
					item.style.backgroundColor = 'transparent';
				}
      }
		}
	}

	registerAimaraTree(tree);

	return tree;
}

// Helper Functions

function createTreeOptions(p_options) {
	var options = {
		imagePath: 'images/',
		theme: 'light',
		animate: false,
		allowHtmlLabels: true,
		name: null
	};

	if (p_options!=undefined && p_options!=null) {
		for (var optionName in p_options) {
			if (Object.prototype.hasOwnProperty.call(p_options,optionName) && p_options[optionName]!==undefined)
				options[optionName] = p_options[optionName];
		}
	}

	options.imagePath = normalizeImagePath(options.imagePath);
	options.theme = normalizeTheme(options.theme);
	options.animate = options.animate===true;

	return options;
}

function normalizeTheme(p_theme) {
	if (p_theme=="dark" || p_theme=="auto")
		return p_theme;

	return "light";
}

function createTreeName(p_options,p_treeInstanceId) {
	if (p_options.name!=undefined && p_options.name!==null && p_options.name!=='')
		return String(p_options.name);

	if (p_options.treeName!=undefined && p_options.treeName!==null && p_options.treeName!=='')
		return String(p_options.treeName);

	if (p_treeInstanceId==1)
		return 'tree';

	return 'aimara_tree_' + p_treeInstanceId;
}

function createNodeIdPrefix(p_treeName,p_treeInstanceId) {
	if (p_treeName=='tree' && p_treeInstanceId==1)
		return 'node_';

	return p_treeName + '_node_';
}

function createContextMenuId(p_treeName,p_treeInstanceId) {
	if (p_treeName=='tree' && p_treeInstanceId==1)
		return 'ul_cm';

	return p_treeName + '_ul_cm';
}

function registerAimaraTree(p_tree) {
	aimaraTreeInstances.push(p_tree);

	p_tree.documentClickHandler = function() {
		p_tree.hideContextMenu();
	};

	if (typeof document!="undefined" && document.addEventListener!=undefined)
		document.addEventListener('click',p_tree.documentClickHandler,false);
	else if (typeof document!="undefined" && document.attachEvent!=undefined)
		document.attachEvent('onclick',p_tree.documentClickHandler);
}

function hideAimaraContextMenus(p_exceptTree) {
	for (var i=0; i<aimaraTreeInstances.length; i++) {
		if (aimaraTreeInstances[i]!=p_exceptTree)
			aimaraTreeInstances[i].hideContextMenu();
	}
}

function normalizeImagePath(p_path) {
	if (p_path==undefined || p_path===null || p_path==='')
		return '';

	if (/[\/\\]$/.test(p_path))
		return p_path;

	return p_path + '/';
}

function setClassName(p_element,p_class,p_enabled) {
	if (p_element==undefined || p_element==null)
		return;

	if (p_element.classList!=undefined) {
		if (p_enabled)
			p_element.classList.add(p_class);
		else
			p_element.classList.remove(p_class);

		return;
	}

	var currentClassName = p_element.className || '';
	var classNames = currentClassName.split(/\s+/);
	var classIndex = classNames.indexOf(p_class);

	if (p_enabled && classIndex==-1)
		classNames.push(p_class);
	else if (!p_enabled && classIndex!=-1)
		classNames.splice(classIndex,1);

	p_element.className = classNames.join(' ').replace(/^\s+|\s+$/g,'');
}

//Create a HTML element specified by parameter 'p_type'
function createSimpleElement(p_type,p_id,p_class) {
	var element = document.createElement(p_type);
	if (p_id!=undefined)
		element.id = p_id;
	if (p_class!=undefined)
		element.className = p_class;
	return element;
}

//Create img element
function createImgElement(p_id,p_class,p_src) {
	var element = document.createElement('img');
	element.alt = '';
	if (p_id!=undefined)
		element.id = p_id;
	if (p_class!=undefined)
		element.className = p_class;
	if (p_src!=undefined)
		element.src = p_src;
	return element;
}
