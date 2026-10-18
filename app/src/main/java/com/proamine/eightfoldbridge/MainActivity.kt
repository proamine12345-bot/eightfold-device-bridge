package com.proamine.eightfoldbridge

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
            setBackgroundColor(Color.rgb(10, 16, 32))
        }
        val title = TextView(this).apply {
            text = "Eightfold Device Bridge"
            textSize = 26f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }
        val description = TextView(this).apply {
            text = "Android app foundation is installed and running.\n\nSecure device pairing and remote-support features can be added to this project."
            textSize = 16f
            setTextColor(Color.rgb(190, 204, 226))
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 0)
        }
        root.addView(title)
        root.addView(description)
        setContentView(root)
    }
}
