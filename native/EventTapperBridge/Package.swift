// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "EventTapperBridge",
    platforms: [
        .macOS(.v11)
    ],
    dependencies: [
        // Add EventTapper as a dependency
        .package(url: "https://github.com/usagimaru/EventTapper.git", from: "1.0.0")
    ],
    targets: [
        .executableTarget(
            name: "EventTapperBridge",
            dependencies: ["EventTapper"],
            path: "Sources"
        )
    ]
)
