plugins {
    java
    application
    id("org.openjfx.javafxplugin") version "0.1.0"
}

group = "com.folio"
version = "1.0.0"

repositories {
    mavenCentral()
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(23))
    }
}

javafx {
    version = "23"
    modules = listOf("javafx.controls", "javafx.web", "javafx.fxml")
}

dependencies {
    implementation("org.fxmisc.richtext:richtextfx:0.11.3")
    implementation("com.vladsch.flexmark:flexmark-all:0.64.8")
    implementation("io.github.mkpaz:atlantafx-base:2.1.0")
    implementation("org.slf4j:slf4j-api:2.0.12")
    implementation("ch.qos.logback:logback-classic:1.5.3")
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

application {
    mainClass.set("com.folio.App")
    applicationDefaultJvmArgs = listOf(
        "-Xdock:name=Folio",
        "--add-opens", "javafx.graphics/javafx.scene=ALL-UNNAMED",
        "--add-opens", "javafx.controls/javafx.scene.control=ALL-UNNAMED",
        "--add-opens", "javafx.web/javafx.scene.web=ALL-UNNAMED",
        "--add-exports", "javafx.web/com.sun.webkit=ALL-UNNAMED"
    )
}

tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
}

// --- jpackage task for macOS .app and .dmg ---

tasks.register<Exec>("jpackageApp") {
    dependsOn("build")
    group = "distribution"
    description = "Create macOS .app bundle using jpackage"

    val jpackagePath = javaToolchains.launcherFor(java.toolchain).map {
        it.executablePath.asFile.parentFile.resolve("jpackage").absolutePath
    }
    val iconPath = file("src/main/resources/icons/Folio.icns").absolutePath
    val outputDir = layout.buildDirectory.dir("jpackage")
    val jpackageInputDir = layout.buildDirectory.dir("jpackage-input")

    doFirst {
        val libDir = jpackageInputDir.get().asFile
        libDir.mkdirs()
        copy {
            from(layout.buildDirectory.dir("libs"))
            into(libDir)
            include("*.jar")
        }
        copy {
            from(configurations.runtimeClasspath.get().files)
            into(libDir)
        }
    }

    commandLine(
        jpackagePath.get(),
        "--type", "app-image",
        "--name", "Folio",
        "--app-version", project.version.toString(),
        "--vendor", "Folio Project",
        "--description", "A modern text editor with Markdown support",
        "--icon", iconPath,
        "--input", jpackageInputDir.get().asFile.absolutePath,
        "--main-jar", "folio-${project.version}.jar",
        "--main-class", "com.folio.Launcher",
        "--dest", outputDir.get().asFile.absolutePath,
        "--java-options", "--add-opens=javafx.graphics/javafx.scene=ALL-UNNAMED",
        "--java-options", "--add-opens=javafx.controls/javafx.scene.control=ALL-UNNAMED",
        "--java-options", "--add-opens=javafx.web/javafx.scene.web=ALL-UNNAMED",
        "--java-options", "--add-exports=javafx.web/com.sun.webkit=ALL-UNNAMED",
        "--java-options", "-Xdock:name=Folio",
        "--mac-package-name", "Folio",
        "--mac-package-identifier", "com.folio"
    )
}

tasks.register<Exec>("jpackageDmg") {
    dependsOn("build")
    group = "distribution"
    description = "Create macOS .dmg installer using jpackage"

    val jpackagePath = javaToolchains.launcherFor(java.toolchain).map {
        it.executablePath.asFile.parentFile.resolve("jpackage").absolutePath
    }
    val iconPath = file("src/main/resources/icons/Folio.icns").absolutePath
    val outputDir = layout.buildDirectory.dir("jpackage-dmg")

    doFirst {
        val libDir = layout.buildDirectory.dir("jpackage-input").get().asFile
        libDir.mkdirs()
        copy {
            from(layout.buildDirectory.dir("libs"))
            into(libDir)
            include("*.jar")
        }
        copy {
            from(configurations.runtimeClasspath.get().files)
            into(libDir)
        }
    }

    val jpackageInputDir = layout.buildDirectory.dir("jpackage-input")

    commandLine(
        jpackagePath.get(),
        "--type", "dmg",
        "--name", "Folio",
        "--app-version", project.version.toString(),
        "--vendor", "Folio Project",
        "--description", "A modern text editor with Markdown support",
        "--icon", iconPath,
        "--input", jpackageInputDir.get().asFile.absolutePath,
        "--main-jar", "folio-${project.version}.jar",
        "--main-class", "com.folio.Launcher",
        "--dest", outputDir.get().asFile.absolutePath,
        "--java-options", "--add-opens=javafx.graphics/javafx.scene=ALL-UNNAMED",
        "--java-options", "--add-opens=javafx.controls/javafx.scene.control=ALL-UNNAMED",
        "--java-options", "--add-opens=javafx.web/javafx.scene.web=ALL-UNNAMED",
        "--java-options", "--add-exports=javafx.web/com.sun.webkit=ALL-UNNAMED",
        "--java-options", "-Xdock:name=Folio",
        "--mac-package-name", "Folio",
        "--mac-package-identifier", "com.folio"
    )
}
