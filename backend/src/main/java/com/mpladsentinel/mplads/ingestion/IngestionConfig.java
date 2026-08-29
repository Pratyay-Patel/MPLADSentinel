package com.mpladsentinel.mplads.ingestion;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Enables {@link IngestionProperties}. All ingestion collaborators are ordinary
 * {@code @Service} / {@code @Component} beans picked up by component scanning.
 */
@Configuration
@EnableConfigurationProperties(IngestionProperties.class)
class IngestionConfig {
}
