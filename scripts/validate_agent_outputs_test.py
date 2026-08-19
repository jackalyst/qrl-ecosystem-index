#!/usr/bin/env python3

import unittest

from validate_agent_outputs import HomepageSpotlightParser


class HomepageSpotlightParserTests(unittest.TestCase):
    def test_collects_spotlight_metadata_links_and_image(self):
        parser = HomepageSpotlightParser()
        parser.feed(
            """
            <aside data-project-spotlight data-project-id="example">
              <a href="/projects/example/">
                <img src="/images/screenshots/example/home.webp" alt="Home screen">
              </a>
              <a href="/projects/example/">View listing</a>
            </aside>
            """
        )

        self.assertEqual(len(parser.spotlights), 1)
        spotlight = parser.spotlights[0]
        self.assertEqual(spotlight["attrs"]["data-project-id"], "example")
        self.assertEqual(
            spotlight["links"], ["/projects/example/", "/projects/example/"]
        )
        self.assertEqual(
            spotlight["images"][0]["src"],
            "/images/screenshots/example/home.webp",
        )

    def test_ignores_images_and_links_outside_spotlight(self):
        parser = HomepageSpotlightParser()
        parser.feed(
            """
            <a href="/projects/other/"><img src="/other.png" alt="Other"></a>
            <aside><a href="/projects/not-featured/">Not featured</a></aside>
            """
        )

        self.assertEqual(parser.spotlights, [])


if __name__ == "__main__":
    unittest.main()
