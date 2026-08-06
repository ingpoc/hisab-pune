import XCTest

final class HisabPuneUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = makeApp(lat: 18.559, lng: 73.7867)
        app.launch()
        dismissLocationAlertIfNeeded()
    }

    func testHereResolvesLocalityAndSession() throws {
        tapUseLocation()

        let locality = app.staticTexts["here.localityName"]
        XCTAssertTrue(locality.waitForExistence(timeout: 12))
        XCTAssertFalse(locality.label.isEmpty)
        XCTAttachment(screenshot: app.screenshot()).lifetime = .keepAlways

        let ward = app.staticTexts["here.ward"]
        XCTAssertTrue(ward.waitForExistence(timeout: 2))
        XCTAssertTrue(ward.label.contains("Ward"))
        XCTAssertTrue(
            app.staticTexts["Commissioner"].waitForExistence(timeout: 2)
                || app.staticTexts["Ward office"].exists
        )

        app.tabBars.buttons["About"].tap()
        let anon = app.staticTexts["about.anonymousId"]
        XCTAssertTrue(anon.waitForExistence(timeout: 10))
        XCTAssertTrue(anon.label.hasPrefix("R-"), "Got \(anon.label)")
    }

    func testReportPinsIssueAtLocation() throws {
        app.tabBars.buttons["Report"].tap()

        let place = app.staticTexts["report.place"]
        XCTAssertTrue(place.waitForExistence(timeout: 10))
        XCTAssertTrue(
            place.label.contains("Ward") || place.label.lowercased().contains("baner"),
            "Expected resolved place, got \(place.label)"
        )

        let note = noteField()
        XCTAssertTrue(note.waitForExistence(timeout: 5))
        note.tap()
        let marker = "UITest drain near Baner \(Int(Date().timeIntervalSince1970))"
        note.typeText(marker)
        dismissKeyboard()

        let submit = app.buttons["report.submit"]
        XCTAssertTrue(submit.waitForExistence(timeout: 2))
        XCTAssertTrue(submit.isEnabled)
        submit.tap()

        let status = app.staticTexts["report.status"]
        XCTAssertTrue(status.waitForExistence(timeout: 12))
        XCTAssertTrue(status.label.contains("Saved"), "Got: \(status.label)")
        XCTAttachment(screenshot: app.screenshot()).lifetime = .keepAlways

        // Cold relaunch avoids keyboard/tab-bar flakiness after the form submit.
        app.terminate()
        app = makeApp(lat: 18.559, lng: 73.7867)
        app.launch()
        dismissLocationAlertIfNeeded()
        tapUseLocation()

        let locality = app.staticTexts["here.localityName"]
        XCTAssertTrue(locality.waitForExistence(timeout: 12))

        let predicate = NSPredicate(format: "label CONTAINS %@", marker)
        let row = app.staticTexts.containing(predicate).element
        for _ in 0..<4 where !row.exists {
            app.swipeUp()
        }
        XCTAssertTrue(row.waitForExistence(timeout: 12), "Expected new report on Here feed")
    }

    func testShortNoteKeepsSubmitDisabled() throws {
        app.tabBars.buttons["Report"].tap()
        let note = noteField()
        XCTAssertTrue(note.waitForExistence(timeout: 5))
        note.tap()
        note.typeText("ab")
        dismissKeyboard()
        let submit = app.buttons["report.submit"]
        XCTAssertTrue(submit.waitForExistence(timeout: 2))
        XCTAssertFalse(submit.isEnabled)
    }

    func testAboutShowsAPIAndAnonymousId() throws {
        tapUseLocation()
        app.tabBars.buttons["About"].tap()

        let api = app.staticTexts["about.apiURL"]
        XCTAssertTrue(api.waitForExistence(timeout: 5))
        XCTAssertTrue(
            api.label.contains("8787")
                || api.label.contains("127.0.0.1")
                || api.label.contains("localhost"),
            "Got \(api.label)"
        )
        XCTAttachment(screenshot: app.screenshot()).lifetime = .keepAlways

        let anon = app.staticTexts["about.anonymousId"]
        XCTAssertTrue(anon.waitForExistence(timeout: 10))
        XCTAssertTrue(anon.label.hasPrefix("R-"))
    }

    func testTabNavigation() throws {
        XCTAssertTrue(app.tabBars.buttons["Here"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Report"].tap()
        XCTAssertTrue(app.buttons["report.submit"].waitForExistence(timeout: 5))
        app.tabBars.buttons["About"].tap()
        XCTAssertTrue(app.staticTexts["about.apiURL"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Here"].tap()
        XCTAssertTrue(
            app.buttons["here.useLocation"].waitForExistence(timeout: 5)
                || app.buttons["Use my location"].waitForExistence(timeout: 2)
        )
    }

    func testOutsidePuneShowsError() throws {
        app.terminate()
        app = makeApp(lat: 19.0760, lng: 72.8777)
        app.launch()
        dismissLocationAlertIfNeeded()

        tapUseLocation()

        let byId = app.descendants(matching: .any)["here.error"]
        let byLabel = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "outside")
        ).element
        let bounds = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "bounds")
        ).element
        let found =
            byId.waitForExistence(timeout: 12)
            || byLabel.waitForExistence(timeout: 2)
            || bounds.waitForExistence(timeout: 2)
        XCTAssertTrue(found, "Expected error for coordinates outside Pune")
        XCTAssertFalse(
            app.staticTexts["here.localityName"].waitForExistence(timeout: 1),
            "Outside-Pune launch must not resolve a locality"
        )
        XCTAttachment(screenshot: app.screenshot()).lifetime = .keepAlways
    }

    // MARK: - Helpers

    private func makeApp(lat: Double, lng: Double) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing"]
        app.launchEnvironment = [
            "HISAB_FORCE_LAT": String(lat),
            "HISAB_FORCE_LNG": String(lng),
        ]
        return app
    }

    private func tapUseLocation() {
        let byId = app.buttons["here.useLocation"]
        let byLabel = app.buttons["Use my location"]
        if byId.waitForExistence(timeout: 5) {
            byId.tap()
        } else {
            XCTAssertTrue(byLabel.waitForExistence(timeout: 3))
            byLabel.tap()
        }
    }

    private func dismissLocationAlertIfNeeded() {
        if app.alerts.buttons["Allow While Using App"].waitForExistence(timeout: 3) {
            app.alerts.buttons["Allow While Using App"].tap()
        } else if app.alerts.buttons["Allow Once"].waitForExistence(timeout: 1) {
            app.alerts.buttons["Allow Once"].tap()
        }
    }

    private func dismissKeyboard() {
        if app.keyboards.firstMatch.exists {
            if app.keyboards.buttons["Return"].exists {
                app.keyboards.buttons["Return"].tap()
            } else if app.keyboards.buttons["Done"].exists {
                app.keyboards.buttons["Done"].tap()
            } else {
                app.swipeDown()
            }
        }
        // Ensure first responder resigns without leaving the Report tab.
        if app.keyboards.firstMatch.exists {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15)).tap()
        }
    }

    private func noteField() -> XCUIElement {
        if app.textFields["report.note"].exists { return app.textFields["report.note"] }
        return app.textViews["report.note"]
    }
}
