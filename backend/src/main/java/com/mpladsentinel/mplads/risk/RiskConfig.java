package com.mpladsentinel.mplads.risk;

import java.time.Clock;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Supplies the {@link Clock} the {@link RiskEngine} reads "now" from. A test can
 * replace this bean with a fixed clock for deterministic assessments.
 */
@Configuration
class RiskConfig {

    @Bean
    @ConditionalOnMissingBean
    Clock clock() {
        return Clock.systemUTC();
    }
}
