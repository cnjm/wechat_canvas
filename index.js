/**
 * WxCanvas 除init外，所有方法支持链式调
 * init需要 await
 * el        节点id
 * design    设计稿尺寸，这里以750为例，也是比较多使用的 (默认750)
 * width     画布宽  设计稿定的宽，假设680
 * height    画布高  设计稿定的宽，假设1000
 * useDpr    是否开启dpr，建议开启，(默认true),调试时false方便调试用户手机像素密度决定图片实际大小，保存下来才更清晰
 *           用户是不会在小程序中看到画图的过程的
 *           结果是直接保存到手机，如果用户需要预览，请css+html 完成更好
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
   * 返回换行之后的文本数组
   * @param {需要换行的字符串} str 
   * @param {一行字节个数} num 
   */
  getBreak(str, num = 1) {
    let arr = [];
    let item = '';
    let len = 0;
    let start = 0;
    for (let i = 0; i < str.length; i++) {
      let a = str.charAt(i);
      if (a.match(/[^\x00-\xff]/ig) != null) { //\x00-\xff→GBK双字节编码范围
        len += 2;
      } else {
        len += 1;
      }
      if (len >= num || i === (str.length - 1)) {
        item = str.substring(start, i + 1);
        arr.push(item);
        start = i + 1;
        len = 0;
      }
    }
    //获取字符串长度（汉字算两个字符，字母数字算一个）
    return arr;
  }
  /**
   * 获取当前设置之后占用了多少的高，以及绘图数组
   * @param {文字，左上角 x，y轴，一行可以书写的字节数，英文字母1，中文2，每行间隔} text, x, y, num, rs
   */
  getLineHeight(text, num, size, rs) {
    const texts = this.getBreak(text, num, rs);
    const info = {
      texts,
      _h: texts.length * (size + rs),
      num,
      size,
      rs
    };
    return info;
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
    this.ctx.beginPath();
    callback();
    this.ctx.stroke();
    this.setOptions(tempObj);
    return this;
  }
  /**
   * 获取图片信息
   * @param {图片的url 可以是网络，本地代码包，临时路径} url 
   * @param {设计稿定宽} w 
   * @param {设计稿定高} h 
   */
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
  /**
   * 获取可绘制的图片对象
   * @param {图片的url 可以是网络，本地代码包，临时路径} path 
   */
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
  /**
   * 绘图
   * @param {见字意} url, x, y, w, h 
   */
  async drawImage(url, x, y, w, h) {
    const info = await this.getImageInfo(url, w, h);
    const drImg = await this.getImage(info.path);
    this.ctx.drawImage(drImg, this.size(x), this.size(y), this.size(w), this.size(h));
    return this;
  }
  /**
   * 自适应高或者宽，绘图
   * @param {getImageInfo返回值} info 
   * @param {左上角坐标} x,y
   */
  async drawAutoImage(info, x, y) {
    const drImg = await this.getImage(info.path);
    this.ctx.drawImage(drImg, this.size(x), this.size(y), this.size(info._w), this.size(info._h));
    return this;
  }
  /**
   * 文字
   * @param {文字，左上角 x，y轴} text, x, y 
   * @param {ctx 可设置的属性} options
   */
  fillText(text, x, y, options = {}) {
    return this.setTempOptions(options, () => {
      this.ctx.fillText(text, this.size(x), this.size(y));
    });
  }
  /**
   * 可换行文字
   * @param {文字，左上角 x，y轴，一行可以书写的字节数，英文字母1，中文2，每行间隔} text, x, y, num, rs
   * @param {ctx 可设置的属性} options
   */
  fillLineText(info, x, y, options = {}) {
    const {
      texts,
      num,
      size,
      rs
    } = info;
    let _x = x,
      _y = y;
    return this.setTempOptions(options, () => {
      texts.forEach((text, index) => {
        _y = y + (size + rs) * index;
        this.ctx.fillText(text, this.size(_x), this.size(_y));
      });
    });
  }
  /**
   * 绘制矩形
   * @param {左上角 x，y轴，宽度，高度} x, y, width, height
   * @param {ctx 可设置的属性} options
   */
  fillRect(x, y, width, height, options = {}) {
    return this.setTempOptions(options, () => {
      this.ctx.fillRect(this.size(x), this.size(y), this.size(width), this.size(height));
    });
  }
  /**
   * 绘制圆形
   * @param {圆心坐标 x，y轴，半径，圆形起始角度} x,y,r,sAngle,eAngle
   * @param {ctx 可设置的属性} options
   */
  fillArc(x, y, r, sAngle, eAngle, options = {}) {
    return this.setTempOptions(options, () => {
      this.ctx.arc(this.size(x), this.size(y), this.size(r), sAngle, eAngle);
      this.ctx.fill();
    });
  }
  /**
   * 绘制圆形图片
   * @param {圆心坐标 x，y轴，半径 ，图片地址} x,y,r,url
   * @param {ctx 可设置的属性} options
   */
  async fillArcImage(x, y, r, url) {
    let tempStyle = this.ctx.strokeStyle;
    this.ctx.strokeStyle = 'transparent';
    this.ctx.beginPath();
    this.ctx.save();
    this.ctx.arc(this.size(x), this.size(y), this.size(r), 0, 2 * Math.PI);
    this.ctx.clip();
    await this.drawImage(url, x - r, y - r, 2 * r, 2 * r);
    this.ctx.stroke();
    this.ctx.restore();
    this.ctx.strokeStyle = tempStyle;
  }
}