/**
 * Created by sww on 2016/10/21.
 */

import React, { Component,PropTypes} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ListView,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  RefreshControl,
  Image,
  AsyncStorage,
} from 'react-native';
const {width,height}=Dimensions.get('window')
const dateKey = 'SwRefresh_date'
const ArrowImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAABQBAMAAAD8TNiNAAAAJ1BMVEUAAACqqqplZWVnZ2doaGhqampoaGhpaWlnZ2dmZmZlZWVmZmZnZ2duD78kAAAADHRSTlMAA6CYqZOlnI+Kg/B86E+1AAAAhklEQVQ4y+2LvQ3CQAxGLSHEBSg8AAX0jECTnhFosgcjZKr8StE3VHz5EkeRMkF0rzk/P58k9rgOW78j+TE99OoeKpEbCvcPVDJ0OvsJ9bQs6Jxs26h5HCrlr9w8vi8zHphfmI0fcvO/ZXJG8wDzcvDFO2Y/AJj9ADE7gXmlxFMIyVpJ7DECzC9J2EC2ECAAAAAASUVORK5CYII=';

/**
 * 下拉刷新默认状态文字
 * @type {{pullToRefresh: string, releaseToRefresh: string, refreshing: string}}
 */
export const RefreshTitle={
  pullToRefresh:'下拉以刷新',
  releaseToRefresh:'松开以刷新',
  refreshing:'正在刷新数据'
}
import dateFormat from './Tools'
/**
 * 下拉刷新状态//0 下拉以刷新 1 松开以刷新 2 刷新中
 * @type {{pullToRefresh: number, releaseToRefresh: number, refreshing: number}}
 */

export const RefreshStatus={
  pullToRefresh:0,
  releaseToRefresh:1,
  refreshing:2
}

/**
 * 上拉加载更多的各状态  1 加载中 2 加载完毕 3 加载完毕 无更多数据
 * @type {loading: number, finish: number, noMoreData: number}}
 */

export const LoadMoreStatus={
  loading:1,
  finish:2,
  noMoreData:3
}
/**
 *===============================================SwRefreshListView=====================================
 */
export class SwRefreshListView extends ListView{
  _isLoading = false

  _offsetY=0
  _isRefreshing=false
  _dragFlag = false; //scrollview是否处于拖动状态的标志

  // 构造
  constructor(props) {
    super(props);
    // 初始状态
    this.state = {
      arrowAngle:new Animated.Value(0),
      refresStatus:RefreshStatus.pullToRefresh,
      refreshTitle:RefreshTitle.pullToRefresh,
      date:'暂无更新',
      loadStatus:LoadMoreStatus.finish,
    };
  }

  static propTypes={
    //-----------------下拉刷新用于代码提示-------------------------------------
    /**
     * 刷新数据时的操作, 参数 end:function 操作结束时执行end() 以结束刷新状态
     */
    onRefresh:PropTypes.func,
    /**
     * 需要返回一个自定义的刷新视图,
     * 参数:
     *  refresStatus:RefreshStatus, 0 下拉以刷新 1 松开以刷新 2 刷新中
     *  offsetY:number 下拉的距离 用于自定义刷新
     */
    customRefreshView:PropTypes.func,
    /**
     * 如果自定义刷新视图 需要传递这个视图的高度 默认视图情况下 此属性无效
     */
    customRefreshViewHeight:PropTypes.number,

    //----------------上拉加载-----------------------------
    /**
     * 自定义底部部刷新指示组件的渲染方法,
     * 参数 下拉状态 LoadMoreStatus
     */
    customLoadMoreView:PropTypes.func,
    /**
     * 处于pushing（加载更多时）状态时执行的方法
     * 参数：end，最后执行完操作后应该调用end(isNoMoreData)。
     * isNoMoreData 表示当前是否已经加载完所有数据 已无更多数据
     */
    onLoadMore:PropTypes.func,
    /**
     * //默认样式中的上拉加载更多的提示语
     */
    pusuToLoadMoreTitle:PropTypes.string,
    /**
     * //默认样式中正在加载的提示语
     */
    loadingTitle:PropTypes.string,
    /**
     * //默认样式中已无更多时的提示语
     */
    noMoreDataTitle:PropTypes.string,
    /**
     * 是否显示底部的加载更多 通常用于全部数据不足一页 底部还显示加载更多导致的难看
     */
    isShowLoadMore:PropTypes.bool

  }


  /**
   * 直接将状态置为没有更多数据状态 通常用于第一次刷新加载的后数据已全部加载 不必下拉刷新
   * 也可使用 isShowLoadMore:PropTypes.bool将上拉加载组件隐藏
   */
  setNoMoreData(){
    this.setState({
      loadStatus:LoadMoreStatus.noMoreData
    })
  }
  /**
   * 重置已无更多数据的状态 通常用于下拉刷新数据完毕后 重置状态
   */
  resetStatus(){
    this.setState({
      loadStatus:LoadMoreStatus.finish
    })
  }


  //--------------------1.0.7新增公开方法------------------

  /*
   * 手动结束加载
   * isNoMoreData 表示当前是否已经加载完所有数据 已无更多数据
   * */
  endLoadMore(isNoMoreData){
    this._isLoading = false
    this.setState({
      loadStatus:isNoMoreData ? LoadMoreStatus.noMoreData:LoadMoreStatus.finish
    })
  }
//----------------------------------------------

  static defaultProps={
    pusuToLoadMoreTitle:'上拉加载更多~~~~',
    loadingTitle:'加载中~~~',
    noMoreDataTitle:'已经加载到底',
    noDataTitle:'暂无数据',
    isShowLoadMore:true

  }


  render(){
    return(
      <ListView
        ref="listView"
        showsVerticalScrollIndicator={false}
        enableEmptySections={true}
        {...this.props}
        onEndReachedThreshold={2}
        onEndReached={(event)=>this._onEndReached(event)}
        renderFooter={
          ()=>this._rendrFooter()
        }
        refreshControl={
        <RefreshControl
                refreshing={ this._isRefreshing }
                onRefresh={ this.props.onRefresh }
                tintColor="gray"
                colors={['#ff0000', '#00ff00', '#0000ff']}
                progressBackgroundColor="#ffffffA0"/>}
      >
      </ListView>
    )
  }
  //-----------------------上拉加载部分-------------------------------
  /**
   * 渲染footer和上拉加载组件
   * @returns {XML}
   * @private
   */
  _rendrFooter(){

    if (!this.props.isShowLoadMore){
      if (!this.props.renderFooter){
        return (
          <View style={{height:0.5}}>
            <View></View>
          </View>
        )
      }else {
        return (
          <View>
            {this.props.renderFooter()}
          </View>
        )
      }
    }
    if (this.props.customLoadMoreView) {
      return (
        <View>
          {this.props.renderFooter?this.props.renderFooter():null}
          {this.props.customLoadMoreView(this.state.loadStatus)}
        </View>
      )
    }
    if (this.props.dataSource._cachedRowCount==0) {
      return(
        <View>
          {this.props.renderFooter?this.props.renderFooter():null}
          <View style={footStyles.footer}>
            <Text style={footStyles.footerText}>{this.props.noDataTitle}</Text>
          </View>
        </View>
      )
    }
    if (this.props.dataSource._cachedRowCount < 10) {
      return(
        <View>
          {this.props.renderFooter?this.props.renderFooter():null}
          <View style={footStyles.footer}>
            <Text style={footStyles.footerText}>{this.props.noMoreDataTitle}</Text>
          </View>
        </View>
      )
    }

    if (this.state.loadStatus == LoadMoreStatus.noMoreData){
      return(
        <View>
          {this.props.renderFooter?this.props.renderFooter():null}
          <View style={footStyles.footer}>
            <Text style={footStyles.footerText}>{this.props.noMoreDataTitle}</Text>
          </View>
        </View>

      )

    }else if(this.state.loadStatus == LoadMoreStatus.finish){
      return(
        <View>
          {this.props.renderFooter?this.props.renderFooter():null}
          <View style={footStyles.footer}>
            {/*<ActivityIndicator/>*/}
            <Text style={footStyles.footerText}>{this.props.pusuToLoadMoreTitle}</Text>
          </View>
        </View>
      )
    }else if(this.state.loadStatus == LoadMoreStatus.loading){
      return(
        <View>
          {this.props.renderFooter?this.props.renderFooter():null}
          <View style={footStyles.footer}>
            <ActivityIndicator/>
            <Text style={footStyles.footerText}>{this.props.loadingTitle}</Text>
          </View>
        </View>
      )

    }





  }

  /**
   * 上刷拉操作
   * @param event
   * @private
   */
  _onEndReached(event){
    if (this.state.loadStatus == LoadMoreStatus.noMoreData || this._isLoading || !this.props.isShowLoadMore){
      return
    }
    this._isLoading = true
    this.setState({
      loadStatus:1
    })
    this.timer = setTimeout(()=>{
      if (this.props.onLoadMore){
        this.props.onLoadMore((isNoMoreData)=>{
          this._isLoading = false
          this.setState({
            loadStatus:isNoMoreData ? LoadMoreStatus.noMoreData:LoadMoreStatus.finish
          })
        })
      }
    },500)

    if(this.props.onEndReached){
      this.props.onEndReached(event)
    }

  }




  componentDidMount(){

  }
  //------------------下拉刷新部分-----------------------------




}

//-------------------------样式-------------------------------
/**
 * 默认头部
 */
const defaultHeaderStyles=StyleSheet.create({
  background:{
    alignItems:'center',
    height:70,
    justifyContent:'center',
  },
  status:{
    flexDirection:'row',
    alignItems:'center'
  },
  arrow:{
    width:14,
    height:23,
    marginRight:10
  },
  statusTitle:{
    fontSize:13,
    color:'#333333'
  },
  date:{
    fontSize:11,
    color:'#333333',
    marginTop:5
  }

})

const footStyles = StyleSheet.create({
  footer:{
    height:30,
    flexDirection:'row',
    justifyContent:'center',
    alignItems:'center'
  },
  footerText:{
    fontSize:15,
    color:'#999999',
    marginLeft:10
  }

});
