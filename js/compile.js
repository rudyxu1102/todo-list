function Compile(el, vm) {
    this.vm = vm;
    this.el = document.querySelector(el);
    this.fragment = null;
    this.init();
}

Compile.prototype = {
    init: function () {
        if (this.el) {
            this.fragment = this.nodeToFragment(this.el);
            this.compileElement(this.fragment);
            this.el.appendChild(this.fragment);
        } else {
            console.log('Dom元素不存在');
        }
    },
    nodeToFragment: function (el) {
        var fragment = document.createDocumentFragment();
        var child = el.firstChild;
        while (child) {
            // 将Dom元素移入fragment中
            fragment.appendChild(child);
            child = el.firstChild
        }
        return fragment;
    },
    compileElement: function (el) {
        var childNodes = el.childNodes;
        var self = this;
        [].slice.call(childNodes).forEach(function(node) {
            var reg = /\{\{(.*)\}\}/;
            var text = node.textContent;
            if (self.isElementNode(node)) { 
               var obj = self.isListDirective(node.attributes)
                if ( obj.isList) {
                    var exp = obj.value;
                    self.compileList(node, self.vm, exp)
                } else {
                    self.compile(node);
                }
            } else if (self.isTextNode(node) && reg.test(text)) {
                self.compileText(node, reg.exec(text)[1]);
            }

            if (node.childNodes && node.childNodes.length) {
                self.compileElement(node);
            }
            // if (self.isListDirective(dir)) {
            //     self.compileList(node, self.vm, exp, dir)
            // }
        });
    },
    compile: function(node) {
        var nodeAttrs = node.attributes;
        var self = this;
        Array.prototype.forEach.call(nodeAttrs, function(attr) {
            var attrName = attr.name;
            if (self.isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                if (self.isEventDirective(dir)) {  // 事件指令
                    self.compileEvent(node, self.vm, exp, dir);
                } 
                else {  // v-model 指令
                    self.compileModel(node, self.vm, exp, dir);
                }
                node.removeAttribute(attrName);
            }
        });
    },
    compileText: function(node, exp) {
        var self = this;
        var initText;

        var key;
        var keyRe = /\w*/g;
        var temText = this.vm;
        while ((key = keyRe.exec(exp)) !== null) {
            keyRe.lastIndex++
            temText = temText[key]
        }
        if (exp.indexOf('.') !== -1) {
            initText = temText
        } else {
            initText = this.vm[exp]
        }
        // 列表渲染
        if (initText == undefined) {
            return 
        }
        this.updateText(node, initText);
        new Watcher(this.vm, exp, function (value) {
            self.updateText(node, value);
        });
    },
    compileEvent: function (node, vm, exp, dir) {
        var eventType = dir.split(':')[1];
        var func, argu;
        if (exp.indexOf('(') !== -1) {
            func = /(\w*)\((.*)\)/.exec(exp)[1];
            argu =  /(\w*)\((.*)\)/.exec(exp)[2];
        } else {
            func = exp;
            argu = '';
        }

        var cb = vm.methods && vm.methods[func];

        if (eventType && cb) {
            node.addEventListener(eventType, cb.bind(vm, argu), false);
        }
    },
    compileList: function (node, vm, exp) {
        var self = this;
        var key = exp.split('in ')[1];
        var childName = exp.split(' in')[0];
        var lists = vm.data[key];
        var reg = /\{\{(.*)\}\}/;        
        var text = node.childNodes[0].textContent;
        var name = reg.exec(text)[1];
        // var tagName = node.nodeName;
        var parent = node.parentNode;

        Array.prototype.forEach.call(parent.childNodes, function (child) {
            if(child.nodeName == "#text" && name === childName) {
                parent.removeChild(child)
            }
        })
        var startIndex = Array.prototype.indexOf.call(parent.childNodes, node)
        var nextNode = node.nextSibling

        if (name === childName) {
            this.listUpdater(parent, startIndex, nextNode, node, lists);
            new Watcher(this.vm, key, function (value) {
                self.listUpdater(parent, startIndex, nextNode, node, value)
            })
        }
    },
    compileModel: function (node, vm, exp, dir) {
        var self = this;
        var val = this.vm[exp];
        this.modelUpdater(node, val);
        new Watcher(this.vm, exp, function (value) {
            self.modelUpdater(node, value);
        });

        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            self.vm[exp] = newValue;
            // val = newValue;
        });
    },
    updateText: function (node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    },
    listUpdater: function (parent, start, nextNode, node, list) {
        var self = this;
        var exp, dir;
        Array.prototype.forEach.call(node.attributes, function (attr) {
            if (attr.name.indexOf('v-on') == 0 ) {
                exp = attr.value;
                dir = attr.name
            }
        })
        var end = Array.prototype.indexOf.call(parent.childNodes, nextNode);
        var length = end - start < 0 ? start+1 : end-start;
        for (var j=0; j<length; j++) {
            parent.removeChild(parent.childNodes[start])
        }

        var fragment = document.createDocumentFragment();
        for (var i=0; i<list.length; i++) {
            var textNode = document.createTextNode(list[i]);
            var ele = document.createElement('li');
            ele.appendChild(textNode);
            fragment.appendChild(ele);
            if (exp) {
                var argu = exp.replace(/\(\w*\)/, '('+i+')')
                self.compileEvent(ele, self.vm, argu, dir)
            }
        }
        if (end === -1) {
            parent.appendChild(fragment)
        } else {
            parent.insertBefore(fragment, nextNode)
        }
        
    },
    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },
    isEventDirective: function(dir) {
        return dir.indexOf('on:') === 0;
    },
    isListDirective: function (attrs) {
        var obj = {}
        Array.prototype.forEach.call(attrs, function (attr) {
            if (attr.name == 'v-for') {
                obj['isList'] = true;
                obj['value'] = attr.value;
            }
        })
        return obj
    },
    isElementNode: function (node) {
        return node.nodeType == 1;
    },
    isTextNode: function(node) {
        return node.nodeType == 3;
    }
}
