// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "LRKeys",
    products: [
        .library(name: "LRKeysCore", targets: ["LRKeysCore"]),
        .executable(name: "lr-keys", targets: ["LRKeysApp"]),
    ],
    targets: [
        .target(
            name: "LRKeysCore",
            resources: [
                .process("Resources"),
            ]
        ),
        .executableTarget(
            name: "LRKeysApp",
            dependencies: ["LRKeysCore"]
        ),
        .testTarget(
            name: "LRKeysCoreTests",
            dependencies: ["LRKeysCore"]
        ),
    ]
)
