package com.promilia.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promilia.user.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
