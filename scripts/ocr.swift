import AppKit
import Foundation
import Vision

let paths = Array(CommandLine.arguments.dropFirst())

for path in paths {
    guard
        let image = NSImage(contentsOfFile: path),
        let data = image.tiffRepresentation,
        let bitmap = NSBitmapImageRep(data: data),
        let cgImage = bitmap.cgImage
    else {
        continue
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try handler.perform([request])

    let observations = request.results ?? []
    let lines = observations
        .compactMap { observation -> (String, CGRect)? in
            guard let candidate = observation.topCandidates(1).first else {
                return nil
            }
            return (candidate.string, observation.boundingBox)
        }
        .sorted { left, right in
            if abs(left.1.maxY - right.1.maxY) > 0.015 {
                return left.1.maxY > right.1.maxY
            }
            return left.1.minX < right.1.minX
        }
        .map(\.0)

    print("FILE\t\(path)")
    print(lines.joined(separator: "\n"))
}
