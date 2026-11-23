package com.promilia;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@MapperScan("com.promilia.**.mapper")
@EnableConfigurationProperties
@EnableAsync
public class PromiliaApplication {

    public static void main(String[] args) {
        SpringApplication.run(PromiliaApplication.class, args);
    }
}
