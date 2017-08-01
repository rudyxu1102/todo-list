function _Vue (options) {
    var self = this;
    this.data = options.data;
    this.methods = options.methods;

    Object.keys(this.data).forEach(function(key) {
        self.proxyKeys(key);
        if (Array.isArray(self.data[key])) {
            self.mutationMethod(key)
        }
    });

    observe(this.data);
    new Compile(options.el, this);
    // options.mounted.call(this); // 所有事情处理好后执行mounted函数
}

_Vue.prototype = {
    // 
    proxyKeys: function (key) {
        var self = this;
        if (typeof key == 'object') {
            for (var child in key)
            this.proxyKeys(child)
        }
        Object.defineProperty(this, key, {
            enumerable: false,
            configurable: true,
            get: function getter () {
                return self.data[key];
            },
            set: function setter (newVal) {
                self.data[key] = newVal;
            }
        });
    },
    mutationMethod: function (key) {
        var self = this;
        const aryMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
        const arrayAugmentations = [];
        aryMethods.forEach((method)=> {
            // 这里是原生Array的原型方法
            let original = Array.prototype[method];

            // 将push, pop等封装好的方法定义在对象arrayAugmentations的属性上
            // 注意：是属性而非原型属性
            arrayAugmentations[method] = function () {
                self.data[key] = ['hi']
                // console.log(self.data[key])
                // console.log(self)
                // 调用对应的原生方法并返回结果
                return original.apply(this, arguments);
            };
        });
        this.data[key].__proto__ = arrayAugmentations;
    }
}
