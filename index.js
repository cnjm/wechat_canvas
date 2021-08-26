/**
 * WxCanvas 除init外，所有方法支持链式调
 * init需要 await
 */
export default class WxCanvas {
  constructor(options) {
    const { el, design, width, height } = options;
    const dpr = wx.getSystemInfoSync().pixelRatio;
    this.dpr = dpr;
    this.el = el;
    this.design = design;
    this.width = width;
    this.height = height;
  }
  static getByteLen() {
    let len = 0;
    for (let i = 0; i < val.length; i++) {
      let a = val.charAt(i);
      if (a.match(/[^\x00-\xff]/ig) != null) { //\x00-\xff→GBK双字节编码范围
        len += 2;
      } else {
        len += 1;
      }
    }
    return len;
  }
  //返回换行之后的文本数组
  static getBreak(str, num = 1) {
    let arr = [];
    let item = '';
    let len = Math.ceil(this.getByteLen(str) / num);
    for (let i = 0; i < len; i++) {
      item = str.substring(i * num, (i + 1) * num);
      arr.push(item)
    }
    //获取字符串长度（汉字算两个字符，字母数字算一个）

    return arr;
  }
  init() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select(this.el).fields({
        node: true,
        size: true
      }).exec((res) => {
        res[0].width = 375;
        res[0].height = 750;
        this.canvas = res[0].node;
        // console.log(this.size(this.height))
        // this.canvas.width = 750;
        // this.canvas.height = 1800;
        console.log(res[0])
        // this.canvas.width = this.size(this.width);
        // this.canvas.height = this.size(this.height);
        this.ctx = this.canvas.getContext('2d');
        resolve(this);
      })
    })
  }
  size(num) {
    return (375 * this.dpr * num) / this.design;
  }
  // 获取当前设置之后占用了多少的高
  getLineHeight() {

  }
  getFilePath() {
    // wx.canvasToTempFilePath({
    //   x: 0,
    //   y: 0,
    //   canvas: wcvs.canvas, //现在的写法
    //   quality: 1,
    //   success: (res) => {
    //     wx.saveImageToPhotosAlbum({
    //       filePath: res.tempFilePath,
    //       success: () => {
    //         wx.showToast({
    //           title: '保存成功',
    //           icon: 'success',
    //           duration: 2000
    //         })
    //       },
    //     });
    //   },
    // });
  }
  /**
   * {font : 'bold 100px serif',fillStyle : '#d2665f'} 这将支持更好的个性化
   * @param {ctx所有支持的配置项} options 
   */
  setOptions(options) {
    if (!options) {
      return this;
    }
    Object.keys(options).forEach(item => {
      this.ctx[item] = options[item];
    })
    return this;
  }
  setTempOptions(options, callback) {
    let tempObj = {}
    Object.keys(options).forEach(item => {
      tempObj[item] = this.ctx[item];
    })
    this.setOptions(options);
    callback();
    this.setOptions(tempObj);
    return this;
  }
  createImage(options) {

    console.log(this)
  }
  fillText(text, x, y, options = {}) {
    return this.setTempOptions(options, () => {
      this.ctx.fillText(text, x, y);
    });
  }
  fillLineText() {
    // console.log(this.getBreak())
  }
  fillRect(x, y, width, height) {
    this.ctx.fillRect(this.size(x), this.size(y), this.size(width), this.size(height));
  }


}