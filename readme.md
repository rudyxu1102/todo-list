### 学习vue的双向绑定
自己动手实现一个简单的todo-list

> 预览地址： https://fatdong1.github.io/todo-list/index.html
### 参考链接
- https://github.com/DMQ/mvvm
- https://github.com/youngwind/blog

### 预览效果
![todo-list](https://segmentfault.com/img/bVR7my?w=408&h=460)

### 数据代理
#### 1.简单介绍数据代理
正常情况下，我们都会把数据写在data里面，如下面所示
```
var vm = new Vue({
    el: '#app',
    data: {
        title: 'hello world'
    }
    methods: {
        changeTitle: function () {
            this.title = 'hello vue'
        }
    }
})
console.log(vm.title) // 'hello world' or 'hello vue'
```
如果没有`数据代理`，而我们又要修改data里面的title的话，methods里面的changeTitle只能这样修改成`this.data.title = 'hello vue'`, 下面的console也只能改成`console.log(vm.data.title)`，数据代理就是这样的功能。
#### 2. 实现原理
通过遍历data里面的属性，将每个属性通过object.defineProperty()设置getter和setter，将data里面的每个属性都复制到与data同级的对象里。

(对应上面的示例代码)

![clipboard.png](https://segmentfault.com/img/bVR7A2?w=444&h=412)




触发这里的getter将会触发data里面对应属性的getter，触发这里的setter将会触发data里面对应属性的setter，从而实现代理。实现代码如下：
```
var self = this;   // this为vue实例， 即vm
Object.keys(this.data).forEach(function(key) {
    Object.defineProperty(this, key, {    // this.title, 即vm.title
        enumerable: false,
        configurable: true,
        get: function getter () {
            return self.data[key];   //触发对应data[key]的getter
        },
        set: function setter (newVal) {
            self.data[key] = newVal;  //触发对应data[key]的setter
        }
    });
}
```

> 对object.defineProperty不熟悉的小伙伴可以在[MDN的文档(链接)](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)学习一下
### 双向绑定
- 数据变动  ---> 视图更新
- 视图更新(input、textarea)  --> 数据变动

`视图更新 --> 数据变动`这个方向的绑定比较简单，主要通过事件监听来改变数据，比如input可以监听input事件，一旦触发input事件就改变data。下面主要来理解一下`数据变动--->视图更新`这个方向的绑定。
#### 1. 数据劫持
不妨让我们自己思考一下，如何实现数据变动，对应绑定数据的视图就更新呢？
答案还是object.defineProperty，通过object.defineProperty遍历设置this.data里面所有属性，在每个属性的setter里面去通知对应的回调函数，这里的回调函数包括dom视图重新渲染的函数、使用$watch添加的回调函数等，这样我们就通过object.defineProperty劫持了数据，当我们对数据重新赋值时，如`this.title = 'hello vue'`,就会触发setter函数，从而触发dom视图重新渲染的函数，实现数据变动，对应视图更新。
#### 2. 发布-订阅模式
那么问题来了，我们如何在setter里面触发所有绑定该数据的回调函数呢？
既然绑定该数据的回调函数不止一个，我们就把所有的回调函数放在一个数组里面，一旦触发该数据的setter，就遍历数组触发里面所有的回调函数，我们把这些回调函数称为`订阅者`。数组最好就定义在setter函数的最近的上级作用域中，如下面实例代码所示。
```
Object.keys(this.data).forEach(function(key) {
    var subs = [];  // 在这里放置添加所有订阅者的数组
    Object.defineProperty(this.data, key, {    // this.data.title
        enumerable: false,
        configurable: true,
        get: function getter () {
            console.log('访问数据啦啦啦')
            return this.data[key];   //返回对应数据的值
        },
        set: function setter (newVal) {
            if (newVal === this.data[key]) {   
                return;    // 如果数据没有变动，函数结束，不执行下面的代码
            }
            this.data[key] = newVal;  //数据重新赋值
            
            subs.forEach(function () {
                // 通知subs里面的所有的订阅者
            })
        }
    });
}
```
那么问题又来了，怎么把绑定数据的所有回调函数放到一个数组里面呢？
我们可以在getter里面做做手脚，我们知道只要访问数据就会触发对应数据的getter，那我们可以先设置一个全局变量target，如果我们要在data里面title属性添加一个订阅者(changeTitle函数)，我们可以先设置target = changeTitle，把changeTitle函数缓存在target中，然后访问this.title去触发title的getter，在getter里面把target这个全局变量的值添加到subs数组里面，添加完成后再把全局变量target设置为null，以便添加其他订阅者。实例代码如下：
```
Object.keys(this.data).forEach(function(key) {
    var subs = [];  // 在这里放置添加所有订阅者的数组
    Object.defineProperty(this.data, key, {    // this.data.title
        enumerable: false,
        configurable: true,
        get: function getter () {
            console.log('访问数据啦啦啦')
            if (target) {
                subs.push(target);                
            }
            return this.data[key];   //返回对应数据的值
        },
        set: function setter (newVal) {
            if (newVal === this.data[key]) {   
                return;    // 如果数据没有变动，函数结束，不执行下面的代码
            }
            this.data[key] = newVal;  //数据重新赋值
            
            subs.forEach(function () {
                // 通知subs里面的所有的订阅者
            })
        }
    });
}
```
上面的代码为了方便理解都是通过简化的，实际上我们把订阅者写成一个构造函数watcher，在实例化订阅者的时候去访问对应的数据，触发相应的getter，详细的代码可以阅读[DMQ的自己动手实现MVVM](https://github.com/DMQ/mvvm)

#### 3. 模板解析
通过上面的两个步骤我们已经实现一旦数据变动，就会通知对应绑定数据的订阅者，接下来我们来简单介绍一个特殊的订阅者，也就是视图更新函数，几乎每个数据都会添加对应的视图更新函数，所以我们就来简单了解一下视图更新函数。

假如说有下面这一段代码，我们怎么把它解析成对应的html呢？
```
<input v-model="title">
<h1>{{title}}</h1>
<button v-on:click="changeTitle">change title<button>
```
 先简单介绍视图更新函数的用途，
比如解析指令`v-model="title"`,`v-on:click="changeTitle"`,还有把{{title}}替换为对应的数据等。     
      
回到上面那个问题，如何解析模板？我们只要去遍历所有dom节点包括其子节点，
- 如果节点属性含有`v-model`，视图更新函数就为把input的value设置为title的值
- 如果节点为文本节点，视图更新函数就为先用正则表达式取出大括号里面的值'title'，再设置文本节点的值为data['title']
- 如果节点属性含有`v-on:xxxx`，视图更新函数就为先用正则获取事件类型为click，然后获取该属性的值为changeTitle，则事件的回调函数为this.methods['changeTitle']，接着用addEventListener监听节点click事件。

我们要知道视图更新函数也是data对应属性的订阅者，如果不知道如何触发视图更新函数，可以把上面的发布-订阅模式再看一遍。

      
 可能有的小伙伴可能还有个疑问，如何实现input节点的值变化后，下面的h1节点的title值也发生变化？在遍历所有节点后，如果节点含有属性`v-model`，就用addEventListener监听input事件，一旦触发input事件，改变data['title']的值，就会触发title的setter，从而通知所有的订阅者。

### 监听数组变化
#### 无法监控每个数组元素
如果让我们自己实现监听数组的变化，我们可能会想到用object.defineProperty去遍历数组每个元素并设置setter，但是vue源码里面却不是这样写的，因为对每一个数组元素defineProperty带来代码本身的复杂度增加和代码执行效率的降低。

  
> 感谢Ma63d[这篇文章下面的的评论](https://github.com/youngwind/blog/issues/85#issuecomment-301400937)，对此解释得很详细，这里也就不再赘述。

#### 变异数组方法
既然无法通过defineProperty监控数组的每个元素，我们可以重写数组的方法(push, pop, shift, unshift, splice, sort, reverse)来改变数组。

[vue文档](https://cn.vuejs.org/v2/guide/list.html#变异方法)中是这样写的：
> Vue 包含一组观察数组的变异方法，所以它们也将会触发视图更新。这些方法如下：
>- push()
> - pop()
> - shift()
> - unshift()
> - splice()
> - sort()
> - reverse()
下面是 [vue早期源码学习系列之二：如何监听一个数组的变化](https://github.com/youngwind/blog/issues/85) 中的实例代码
```
const aryMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
const arrayAugmentations = [];

aryMethods.forEach((method)=> {

    // 这里是原生Array的原型方法
    let original = Array.prototype[method];

   // 将push, pop等封装好的方法定义在对象arrayAugmentations的属性上
   // 注意：是属性而非原型属性
    arrayAugmentations[method] = function () {
        console.log('我被改变啦!');

        // 调用对应的原生方法并返回结果
        return original.apply(this, arguments);
    };

});

let list = ['a', 'b', 'c'];
// 将我们要监听的数组的原型指针指向上面定义的空数组对象
// 别忘了这个空数组的属性上定义了我们封装好的push等方法
list.__proto__ = arrayAugmentations;
list.push('d');  // 我被改变啦！ 4

// 这里的list2没有被重新定义原型指针，所以就正常输出
let list2 = ['a', 'b', 'c'];
list2.push('d');  // 4
``` 
对__proto__不熟悉的小伙伴可以去看一下[王福明的博客](http://www.cnblogs.com/wangfupeng1988/p/3977924.html)，写的很好。
#### 变异数组方法的缺陷
[vue文档中变异数组方法的缺陷](https://cn.vuejs.org/v2/guide/list.html#注意事项)
> 由于 JavaScript 的限制， Vue 不能检测以下变动的数组：
> 1. 当你利用索引直接设置一个项时，例如： vm.items[indexOfItem] = newValue
> 2. 当你修改数组的长度时，例如： vm.items.length = newLength
同时文档中也介绍了如何解决上面这两个问题。