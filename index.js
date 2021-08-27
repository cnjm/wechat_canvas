/**
 * WxCanvas 除init外，所有方法支持链式调
 * init需要 await
 */
export default class WxCanvas {
  constructor(options) {
    const {
      el,
      design,
      width,
      height,
      useDpr = false
    } = options;
    const dpr = wx.getSystemInfoSync().pixelRatio;
    this.dpr = useDpr ? dpr : 1;
    this.el = el;
    this.design = design || 750;
    this.width = width;
    this.height = height;
  }
  /**
   * 返回一段字符串的字节数 中文2  英文1
   * @param {需要计算的字符串} str 
   */
  static getByteLen(str) {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      let a = str.charAt(i);
      if (a.match(/[^\x00-\xff]/ig) != null) { //\x00-\xff→GBK双字节编码范围
        len += 2;
      } else {
        len += 1;
      }
    }
    return len;
  }
  /**
   * 返回换行之后的文本数组
   * @param {需要换行的字符串} str 
   * @param {一行字节个数} num 
   */
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
  /**
   * 初始化 画布的准备将在次完成
   */
  init() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select(this.el).fields({
        node: true,
        size: true
      }).exec((res) => {
        this.canvas = res[0].node;
        this.canvas.width = res[0].width;
        this.canvas.height = res[0].height;
        this.ctx = this.canvas.getContext('2d');
        resolve(this);
      })
    })
  }
  /**
   * 获取转换后给画布的 数值
   * @param {设计稿数值} num 
   */
  size(num) {
    return (375 * this.dpr * num) / this.design;
  }
  /**
   * 获取当前设置之后占用了多少的高
   * @param {ctx所有支持的配置项} options 
   */
  getLineHeight() {

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
  /**
   * @param {ctx所有支持的配置项} options 
   * @param {ctx画布操作的回调函数} callback 
   */
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
  getImageInfo(url, w, h) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: url,
        success: function (res) {
          const r = res.width / res.height;
          let _w = 0,
            _h = 0;
          if (h) { //定高
            _h = h;
            _w = _h * r;
          } else {
            _w = w;
            _h = _w / r;
          }
          res._w = _w;
          res._h = _h;
          resolve(res);
          return this;
        }
      })
    })
  }
  async getImage(path) {
    return new Promise((resolve, reject) => {
      const drImg = this.canvas.createImage();
      drImg.src = path;
      drImg.onload = () => {
        resolve(drImg);
        return this;
      }
    })
  }
  async drawImage(url, x, y, w, h) {
    const info = await this.getImageInfo(url, w, h);
    const drImg = await this.getImage(info.path);
    this.ctx.drawImage(drImg, this.size(x), this.size(y), this.size(w), this.size(h));
    return this;
  }
  async drawAutoImage(info, x, y) {
    const drImg = await this.getImage(info.path);
    this.ctx.drawImage(drImg, this.size(x), this.size(y), this.size(info._w), this.size(info._h));
    return this;
  }
  fillText(text, x, y, options = {}) {
    return this.setTempOptions(options, () => {
      this.ctx.fillText(text, this.size(x), this.size(y));
    });
  }
  fillLineText() {
    return this;
    return this.setTempOptions(options, () => {
      this.ctx.fillText(text, this.size(x), this.size(y));
    });
  }
  fillRect(x, y, width, height, options) {
    return this.setTempOptions(options, () => {
      this.ctx.fillRect(this.size(x), this.size(y), this.size(width), this.size(height));
    });
  }
}