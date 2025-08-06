/// 集合扩展
/// 
/// 按指定条件查找元素
/// 
/// 如果未找到，则返回 [null]
extension IterableExt<T> on Iterable<T> {
  T? find(bool Function(T) test) {
    for (final e in this) {
      if (test(e)) return e;
    }
    return null;
  }
}