function Watcher(vm, exp, cb) {
    this.cb = cb;
    this.vm = vm;
    this.exp = exp;
    this.value = this.get();  // 将自己添加到订阅器的操作
}

Watcher.prototype = {
    update: function() {
        this.run();
    },
    run: function() {
        var value;
        if (this.exp.indexOf('.') !== -1) {
            var keyArr = this.exp.split('.')
            var obj = this.vm.data;
            for (var i=0; i<keyArr.length-1; i++) {
                obj = obj[keyArr[i]]
            }
            value = obj[keyArr[i]]
        } else {
            value = this.vm.data[this.exp];
        }
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.vm, value, oldVal);
        }
    },
    get: function() {
        // var key;
        // while ((key = keyRe.exec(this.exp)) !== null) {
        //     keyRe.lastIndex++
        //     temText = temText[key]
        // }
        // Dep.target = this;  // 缓存自己
        // var value = temText
        if (this.exp.indexOf('.') !== -1) {
            var keyArr = this.exp.split('.')
            var obj = this.vm.data;
            for (var i=0; i<keyArr.length-1; i++) {
                obj = obj[keyArr[i]]
            }
            Dep.target = this;  // 缓存自己
            var value = obj[keyArr[i]]
        } else {
            Dep.target = this;  // 缓存自己
            var value = this.vm.data[this.exp]  // 强制执行监听器里的get函数            
        }

        Dep.target = null;  // 释放自己
        return value;
    }
};
